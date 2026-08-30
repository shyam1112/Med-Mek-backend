import { Response } from 'express';
import Medicine from '../models/Medicine';
import StockTransaction from '../models/StockTransaction';
import { AuthRequest } from '../types';
import { getPaginationParams } from '../utils/helpers';

export const stockIn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { medicineId, quantity, notes } = req.body;
    const medicine = await Medicine.findOne({ _id: medicineId, owner: req.userId });
    if (!medicine) {
      res.status(404).json({ success: false, message: 'Medicine not found.' });
      return;
    }

    const previousStock = medicine.currentStock;
    medicine.currentStock += Number(quantity);
    await medicine.save();

    const transaction = await StockTransaction.create({
      owner: req.userId,
      medicine: medicine._id,
      medicineName: medicine.name,
      transactionType: 'stock_in',
      quantity: Number(quantity),
      previousStock,
      newStock: medicine.currentStock,
      notes: notes || '',
    });

    res.json({ success: true, message: 'Stock added.', data: { medicine, transaction } });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to add stock.' });
  }
};

export const stockOut = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { medicineId, quantity, notes } = req.body;
    const medicine = await Medicine.findOne({ _id: medicineId, owner: req.userId });
    if (!medicine) {
      res.status(404).json({ success: false, message: 'Medicine not found.' });
      return;
    }
    if (medicine.currentStock < Number(quantity)) {
      res.status(400).json({ success: false, message: 'Insufficient stock.' });
      return;
    }

    const previousStock = medicine.currentStock;
    medicine.currentStock -= Number(quantity);
    await medicine.save();

    const transaction = await StockTransaction.create({
      owner: req.userId,
      medicine: medicine._id,
      medicineName: medicine.name,
      transactionType: 'stock_out',
      quantity: Number(quantity),
      previousStock,
      newStock: medicine.currentStock,
      notes: notes || '',
    });

    res.json({ success: true, message: 'Stock removed.', data: { medicine, transaction } });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to remove stock.' });
  }
};

export const adjustStock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { medicineId, newQuantity, notes } = req.body;
    const medicine = await Medicine.findOne({ _id: medicineId, owner: req.userId });
    if (!medicine) {
      res.status(404).json({ success: false, message: 'Medicine not found.' });
      return;
    }

    const previousStock = medicine.currentStock;
    const adjustQty = newQuantity - previousStock;
    medicine.currentStock = Number(newQuantity);
    await medicine.save();

    const transaction = await StockTransaction.create({
      owner: req.userId,
      medicine: medicine._id,
      medicineName: medicine.name,
      transactionType: 'adjustment',
      quantity: adjustQty,
      previousStock,
      newStock: medicine.currentStock,
      notes: notes || 'Manual adjustment',
    });

    res.json({ success: true, message: 'Stock adjusted.', data: { medicine, transaction } });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to adjust stock.' });
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
