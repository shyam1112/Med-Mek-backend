import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Medicine from '../models/Medicine';
import Supplier from '../models/Supplier';
import Customer from '../models/Customer';
import Purchase from '../models/Purchase';
import Sale from '../models/Sale';
import StockTransaction from '../models/StockTransaction';
import { AuthRequest } from '../types';
import { getPaginationParams } from '../utils/helpers';

const signAdminToken = (userId: string): string => {
  return jwt.sign({ userId, role: 'superadmin' }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '12h',
  } as jwt.SignOptions);
};

export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ success: false, message: 'Username and password are required.' });
      return;
    }

    const user = await User.findOne({
      username: username.toLowerCase(),
      role: 'superadmin',
    }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
      return;
    }

    const token = signAdminToken(user._id.toString());
    res.json({
      success: true,
      message: 'Admin login successful.',
      data: { token, admin: user },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const getRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query as Record<string, string>);
    const { status, search } = req.query;

    const filter: Record<string, unknown> = { role: 'user' };
    if (status && status !== 'all') filter.status = status;
    if (search) {
      filter.$or = [
        { name: new RegExp(search as string, 'i') },
        { username: new RegExp(search as string, 'i') },
        { email: new RegExp(search as string, 'i') },
        { storeName: new RegExp(search as string, 'i') },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch requests.' });
  }
};

export const getRequestStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [total, pending, approved, rejected] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'user', status: 'pending' }),
      User.countDocuments({ role: 'user', status: 'approved' }),
      User.countDocuments({ role: 'user', status: 'rejected' }),
    ]);

    res.json({ success: true, data: { total, pending, approved, rejected } });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
  }
};

export const approveRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findOne({ _id: req.params.id, role: 'user' });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }
    if (user.status === 'approved') {
      res.status(400).json({ success: false, message: 'User is already approved.' });
      return;
    }

    user.status = 'approved';
    user.rejectionReason = '';
    await user.save();

    res.json({ success: true, message: `${user.name} has been approved successfully.`, data: user });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to approve request.' });
  }
};

export const rejectRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reason } = req.body;
    const user = await User.findOne({ _id: req.params.id, role: 'user' });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    user.status = 'rejected';
    user.rejectionReason = reason || 'Request rejected by admin.';
    await user.save();

    res.json({ success: true, message: `${user.name}'s request has been rejected.`, data: user });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to reject request.' });
  }
};

export const resetToApproved = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findOne({ _id: req.params.id, role: 'user' });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }
    user.status = 'approved';
    user.rejectionReason = '';
    await user.save();
    res.json({ success: true, message: 'User re-approved.', data: user });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to update.' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findOneAndDelete({ _id: req.params.id, role: 'user' });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    // Cascade-delete this store's business data so it doesn't linger orphaned.
    const owner = user._id;
    await Promise.all([
      Medicine.deleteMany({ owner }),
      Supplier.deleteMany({ owner }),
      Customer.deleteMany({ owner }),
      Purchase.deleteMany({ owner }),
      Sale.deleteMany({ owner }),
      StockTransaction.deleteMany({ owner }),
    ]);

    res.json({ success: true, message: 'User deleted.' });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to delete user.' });
  }
};
