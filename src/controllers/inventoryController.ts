import { Response } from 'express';
import mongoose from 'mongoose';
import Medicine from '../models/Medicine';
import StockTransaction from '../models/StockTransaction';
import { AuthRequest } from '../types';
import { getPaginationParams } from '../utils/helpers';

export const stockIn = async (req: AuthRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  try {
    const { medicineId, quantity, notes } = req.body;
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      res.status(400).json({ success: false, message: 'Quantity must be greater than 0.' });
      return;
    }

    let result: { medicine: unknown; transaction: unknown } | null = null;

    await session.withTransaction(async () => {
      // Atomic $inc avoids a lost update if two stock changes on the same
      // medicine (e.g. a stock-in and a concurrent sale) land at the same time.
      const medicine = await Medicine.findOneAndUpdate(
        { _id: medicineId, owner: req.userId },
        { $inc: { currentStock: qty } },
        { new: true, session }
      );
      if (!medicine) {
        throw Object.assign(new Error('Medicine not found.'), { statusCode: 404 });
      }

      const [transaction] = await StockTransaction.create(
        [{
          owner: req.userId,
          medicine: medicine._id,
          medicineName: medicine.name,
          transactionType: 'stock_in',
          quantity: qty,
          previousStock: medicine.currentStock - qty,
          newStock: medicine.currentStock,
          notes: notes || '',
        }],
        { session }
      );

      result = { medicine, transaction };
    });

    res.json({ success: true, message: 'Stock added.', data: result });
  } catch (err) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    if (statusCode) {
      res.status(statusCode).json({ success: false, message: (err as Error).message });
      return;
    }
    res.status(500).json({ success: false, message: 'Failed to add stock.' });
  } finally {
    session.endSession();
  }
};

export const stockOut = async (req: AuthRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  try {
    const { medicineId, quantity, notes } = req.body;
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      res.status(400).json({ success: false, message: 'Quantity must be greater than 0.' });
      return;
    }

    let result: { medicine: unknown; transaction: unknown } | null = null;

    await session.withTransaction(async () => {
      // Atomic check-and-decrement — closes the race where a concurrent sale
      // or another stock-out on the same medicine could both pass a separate
      // "is there enough stock" check before either write lands.
      const medicine = await Medicine.findOneAndUpdate(
        { _id: medicineId, owner: req.userId, currentStock: { $gte: qty } },
        { $inc: { currentStock: -qty } },
        { new: true, session }
      );

      if (!medicine) {
        const existing = await Medicine.findOne({ _id: medicineId, owner: req.userId }).session(session);
        if (!existing) {
          throw Object.assign(new Error('Medicine not found.'), { statusCode: 404 });
        }
        throw Object.assign(new Error('Insufficient stock.'), { statusCode: 400 });
      }

      const [transaction] = await StockTransaction.create(
        [{
          owner: req.userId,
          medicine: medicine._id,
          medicineName: medicine.name,
          transactionType: 'stock_out',
          quantity: qty,
          previousStock: medicine.currentStock + qty,
          newStock: medicine.currentStock,
          notes: notes || '',
        }],
        { session }
      );

      result = { medicine, transaction };
    });

    res.json({ success: true, message: 'Stock removed.', data: result });
  } catch (err) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    if (statusCode) {
      res.status(statusCode).json({ success: false, message: (err as Error).message });
      return;
    }
    res.status(500).json({ success: false, message: 'Failed to remove stock.' });
  } finally {
    session.endSession();
  }
};

export const adjustStock = async (req: AuthRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  try {
    const { medicineId, newQuantity, notes } = req.body;
    const nextQty = Number(newQuantity);
    if (!Number.isFinite(nextQty) || nextQty < 0) {
      res.status(400).json({ success: false, message: 'New quantity must be 0 or greater.' });
      return;
    }

    let result: { medicine: unknown; transaction: unknown } | null = null;

    await session.withTransaction(async () => {
      // findOneAndUpdate with { new: false } atomically returns the pre-update
      // doc, so previousStock reflects the exact value overwritten — no
      // separate read-then-write gap for another request to land in between.
      const before = await Medicine.findOneAndUpdate(
        { _id: medicineId, owner: req.userId },
        { $set: { currentStock: nextQty } },
        { new: false, session }
      );
      if (!before) {
        throw Object.assign(new Error('Medicine not found.'), { statusCode: 404 });
      }

      const previousStock = before.currentStock;
      const adjustQty = nextQty - previousStock;

      const [transaction] = await StockTransaction.create(
        [{
          owner: req.userId,
          medicine: before._id,
          medicineName: before.name,
          transactionType: 'adjustment',
          quantity: adjustQty,
          previousStock,
          newStock: nextQty,
          notes: notes || 'Manual adjustment',
        }],
        { session }
      );

      result = { medicine: { ...before.toObject(), currentStock: nextQty }, transaction };
    });

    res.json({ success: true, message: 'Stock adjusted.', data: result });
  } catch (err) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    if (statusCode) {
      res.status(statusCode).json({ success: false, message: (err as Error).message });
      return;
    }
    res.status(500).json({ success: false, message: 'Failed to adjust stock.' });
  } finally {
    session.endSession();
  }
};

export const getTransactionHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query as Record<string, string>);
    const { type, medicineId } = req.query;

    const filter: Record<string, unknown> = { owner: req.userId };
    if (type) filter.transactionType = type;
    if (medicineId) filter.medicine = medicineId;

    const [transactions, total] = await Promise.all([
      StockTransaction.find(filter)
        .populate('medicine', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      StockTransaction.countDocuments(filter),
    ]);

    res.json({
      success: true,
      message: 'Transaction history fetched.',
      data: transactions,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch transactions.' });
  }
};
