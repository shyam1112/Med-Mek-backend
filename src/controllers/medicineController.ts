import { Response } from 'express';
import Medicine from '../models/Medicine';
import StockTransaction from '../models/StockTransaction';
import { AuthRequest } from '../types';
import { getPaginationParams, getValidationMessage } from '../utils/helpers';

export const getMedicines = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query as Record<string, string>);
    const { search, category, lowStock, expiringSoon } = req.query;

    const filter: Record<string, unknown> = { owner: req.userId, isActive: true };

    if (search) {
      // Regex substring match, not $text — see customerController.getCustomers
      // for why $text's OR/token matching is the wrong tool here.
      const regex = new RegExp(search as string, 'i');
      filter.$or = [{ name: regex }, { genericName: regex }, { barcode: regex }];
    }
    if (category) filter.category = category;
    if (lowStock === 'true') {
      filter.$expr = { $lte: ['$currentStock', '$minimumStockLevel'] };
    }
    if (expiringSoon) {
      const days = parseInt(expiringSoon as string, 10);
      filter.expiryDate = { $lte: new Date(Date.now() + days * 24 * 60 * 60 * 1000) };
    }

    const [medicines, total] = await Promise.all([
      Medicine.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
      Medicine.countDocuments(filter),
    ]);

    res.json({
      success: true,
      message: 'Medicines fetched.',
      data: medicines,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch medicines.' });
  }
};

export const getMedicineById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const medicine = await Medicine.findOne({ _id: req.params.id, owner: req.userId });
    if (!medicine || !medicine.isActive) {
      res.status(404).json({ success: false, message: 'Medicine not found.' });
      return;
    }
    res.json({ success: true, message: 'Medicine fetched.', data: medicine });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch medicine.' });
  }
};

export const createMedicine = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const medicine = await Medicine.create({ ...req.body, owner: req.userId });

    if (medicine.currentStock > 0) {
      await StockTransaction.create({
        owner: req.userId,
        medicine: medicine._id,
        medicineName: medicine.name,
        transactionType: 'stock_in',
        quantity: medicine.currentStock,
        previousStock: 0,
        newStock: medicine.currentStock,
        notes: 'Initial stock entry',
      });
    }

    res.status(201).json({ success: true, message: 'Medicine created.', data: medicine });
  } catch (error: unknown) {
    const validationMessage = getValidationMessage(error);
    if ((error as { code?: number }).code === 11000) {
      res.status(400).json({ success: false, message: 'Medicine with this barcode already exists.' });
    } else if (validationMessage) {
      res.status(400).json({ success: false, message: validationMessage });
    } else {
      res.status(500).json({ success: false, message: 'Failed to create medicine.' });
    }
  }
};

export const updateMedicine = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { owner: _owner, ...updates } = req.body;
    const medicine = await Medicine.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      updates,
      { new: true, runValidators: true }
    );
    if (!medicine) {
      res.status(404).json({ success: false, message: 'Medicine not found.' });
      return;
    }
    res.json({ success: true, message: 'Medicine updated.', data: medicine });
  } catch (error: unknown) {
    const validationMessage = getValidationMessage(error);
    if (validationMessage) {
      res.status(400).json({ success: false, message: validationMessage });
    } else {
      res.status(500).json({ success: false, message: 'Failed to update medicine.' });
    }
  }
};

export const deleteMedicine = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const medicine = await Medicine.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      { isActive: false },
      { new: true }
    );
    if (!medicine) {
      res.status(404).json({ success: false, message: 'Medicine not found.' });
      return;
    }
    res.json({ success: true, message: 'Medicine deleted.' });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to delete medicine.' });
  }
};

export const getMedicineStockHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query as Record<string, string>);
    const filter = { owner: req.userId, medicine: req.params.id };
    const [history, total] = await Promise.all([
      StockTransaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      StockTransaction.countDocuments(filter),
    ]);
    res.json({
      success: true,
      message: 'Stock history fetched.',
      data: history,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch stock history.' });
  }
};

export const searchMedicines = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { q, includeOutOfStock } = req.query;
    const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 100);

    const filter: Record<string, unknown> = { owner: req.userId, isActive: true };
    if (includeOutOfStock !== 'true') {
      filter.currentStock = { $gt: 0 };
    }
    if (q) {
      filter.$or = [
        { name: new RegExp(q as string, 'i') },
        { genericName: new RegExp(q as string, 'i') },
        { barcode: q as string },
      ];
    }

    const medicines = await Medicine.find(filter).sort({ name: 1 }).limit(limit);

    res.json({ success: true, data: medicines });
  } catch {
    res.status(500).json({ success: false, message: 'Search failed.' });
  }
};

export const getCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const categories = await Medicine.distinct('category', { owner: req.userId, isActive: true });
    res.json({ success: true, data: categories.sort() });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch categories.' });
  }
};
