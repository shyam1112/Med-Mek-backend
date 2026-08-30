import { Response } from 'express';
import Supplier from '../models/Supplier';
import Purchase from '../models/Purchase';
import { AuthRequest } from '../types';
import { getPaginationParams } from '../utils/helpers';

export const getSuppliers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query as Record<string, string>);
    const { search } = req.query;

    const filter: Record<string, unknown> = { owner: req.userId, isActive: true };
    if (search) filter.$text = { $search: search as string };

    const [suppliers, total] = await Promise.all([
      Supplier.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
      Supplier.countDocuments(filter),
    ]);

    res.json({
      success: true,
      message: 'Suppliers fetched.',
      data: suppliers,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch suppliers.' });
  }
};

export const getSupplierById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, owner: req.userId });
    if (!supplier || !supplier.isActive) {
      res.status(404).json({ success: false, message: 'Supplier not found.' });
      return;
    }
    res.json({ success: true, data: supplier });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch supplier.' });
  }
};

export const createSupplier = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const supplier = await Supplier.create({ ...req.body, owner: req.userId });
    res.status(201).json({ success: true, message: 'Supplier created.', data: supplier });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to create supplier.' });
  }
};

export const updateSupplier = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { owner: _owner, ...updates } = req.body;
    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      updates,
      { new: true, runValidators: true }
    );
    if (!supplier) {
      res.status(404).json({ success: false, message: 'Supplier not found.' });
      return;
    }
    res.json({ success: true, message: 'Supplier updated.', data: supplier });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to update supplier.' });
  }
};

export const deleteSupplier = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      { isActive: false },
      { new: true }
    );
    if (!supplier) {
      res.status(404).json({ success: false, message: 'Supplier not found.' });
      return;
    }
    res.json({ success: true, message: 'Supplier deleted.' });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to delete supplier.' });
  }
};

export const getSupplierPurchaseHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query as Record<string, string>);
    const filter = { owner: req.userId, supplier: req.params.id };
    const [purchases, total] = await Promise.all([
      Purchase.find(filter).sort({ purchaseDate: -1 }).skip(skip).limit(limit),
      Purchase.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: purchases,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch purchase history.' });
  }
};

export const getSupplierStatement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, owner: req.userId });
    if (!supplier || !supplier.isActive) {
      res.status(404).json({ success: false, message: 'Supplier not found.' });
      return;
    }

    const supplierId = supplier._id;

    // Overall summary
    const [summary] = await Purchase.aggregate([
      { $match: { owner: supplier.owner, supplier: supplierId } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$paidAmount' },
          totalBalance: { $sum: '$balanceAmount' },
        },
      },
    ]);

    // Year-wise breakdown
    const yearlyBreakdown = await Purchase.aggregate([
      { $match: { owner: supplier.owner, supplier: supplierId } },
      {
        $group: {
          _id: { $year: '$purchaseDate' },
          orders: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          paidAmount: { $sum: '$paidAmount' },
          balanceAmount: { $sum: '$balanceAmount' },
        },
      },
      { $sort: { _id: -1 } },
    ]);

    // Recent purchases (last 20)
    const recentPurchases = await Purchase.find({ owner: req.userId, supplier: supplierId })
      .sort({ purchaseDate: -1 })
      .limit(20)
      .select('invoiceNumber purchaseDate totalAmount paidAmount balanceAmount paymentStatus items');

    res.json({
      success: true,
      data: {
        supplier,
        summary: summary || { totalOrders: 0, totalAmount: 0, totalPaid: 0, totalBalance: 0 },
        yearlyBreakdown,
        recentPurchases,
      },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch supplier statement.' });
  }
};
