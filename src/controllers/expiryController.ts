import { Response } from 'express';
import Medicine from '../models/Medicine';
import { AuthRequest } from '../types';
import { getPaginationParams } from '../utils/helpers';

export const getExpiryAlerts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query as Record<string, string>);
    const { days } = req.query;
    const alertDays = parseInt((days as string) || '90', 10);
    const now = new Date();
    const alertDate = new Date(Date.now() + alertDays * 24 * 60 * 60 * 1000);

    const filter = {
      owner: req.userId,
      isActive: true,
      expiryDate: { $lte: alertDate },
      currentStock: { $gt: 0 },
    };

    const [medicines, total] = await Promise.all([
      Medicine.find(filter).sort({ expiryDate: 1 }).skip(skip).limit(limit),
      Medicine.countDocuments(filter),
    ]);

    const categorized = medicines.map((m) => {
      const daysToExpiry = m.expiryDate
        ? Math.ceil((m.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 9999;
      let status: 'expired' | 'critical' | 'warning' | 'watch';
      if (daysToExpiry < 0) status = 'expired';
      else if (daysToExpiry <= 30) status = 'critical';
      else if (daysToExpiry <= 60) status = 'warning';
      else status = 'watch';

      return { ...m.toObject(), daysToExpiry, expiryStatus: status };
    });

    res.json({
      success: true,
      data: categorized,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch expiry alerts.' });
  }
};

export const getExpirySummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const owner = req.userId;

    const [expired, expiring30, expiring60, expiring90] = await Promise.all([
      Medicine.countDocuments({ owner, isActive: true, expiryDate: { $lt: now }, currentStock: { $gt: 0 } }),
      Medicine.countDocuments({
        owner,
        isActive: true,
        expiryDate: { $gte: now, $lt: new Date(Date.now() + 30 * 86400000) },
        currentStock: { $gt: 0 },
      }),
      Medicine.countDocuments({
        owner,
        isActive: true,
        expiryDate: {
          $gte: new Date(Date.now() + 30 * 86400000),
          $lt: new Date(Date.now() + 60 * 86400000),
        },
        currentStock: { $gt: 0 },
      }),
      Medicine.countDocuments({
        owner,
        isActive: true,
        expiryDate: {
          $gte: new Date(Date.now() + 60 * 86400000),
          $lt: new Date(Date.now() + 90 * 86400000),
        },
        currentStock: { $gt: 0 },
      }),
    ]);

    res.json({
      success: true,
      data: { expired, expiring30, expiring60, expiring90 },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch expiry summary.' });
  }
};
