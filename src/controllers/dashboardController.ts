import { Response } from 'express';
import { Types } from 'mongoose';
import Medicine from '../models/Medicine';
import Sale from '../models/Sale';
import SaleReturn from '../models/SaleReturn';
import { AuthRequest } from '../types';

export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const owner = new Types.ObjectId(req.userId);
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [
      todaySales,
      monthlySales,
      totalMedicines,
      lowStock,
      expiredMedicines,
      expiringSoon30,
      expiringSoon60,
      recentSales,
      monthlyRevenueAgg,
      todayReturns,
      monthlyReturns,
      monthlyReturnsByDayAgg,
    ] = await Promise.all([
      Sale.aggregate([
        { $match: { owner, saleDate: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),
      Sale.aggregate([
        { $match: { owner, saleDate: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),
      Medicine.countDocuments({ owner, isActive: true }),
      Medicine.countDocuments({ owner, isActive: true, $expr: { $lte: ['$currentStock', '$minimumStockLevel'] } }),
      Medicine.countDocuments({ owner, isActive: true, expiryDate: { $lt: new Date() } }),
      Medicine.countDocuments({
        owner,
        isActive: true,
        expiryDate: { $gte: new Date(), $lt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      }),
      Medicine.countDocuments({
        owner,
        isActive: true,
        expiryDate: {
          $gte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          $lt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        },
      }),
      Sale.find({ owner }, { billNumber: 1, customerName: 1, totalAmount: 1, saleDate: 1 })
        .sort({ saleDate: -1 })
        .limit(10),
      Sale.aggregate([
        { $match: { owner, saleDate: { $gte: monthStart } } },
        {
          $group: {
            _id: { $dayOfMonth: '$saleDate' },
            revenue: { $sum: '$totalAmount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // Returns are netted by the date they were processed, not the original
      // sale date — standard net-revenue accounting for a POS.
      SaleReturn.aggregate([
        { $match: { owner, createdAt: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: '$totalRefund' } } },
      ]),
      SaleReturn.aggregate([
        { $match: { owner, createdAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$totalRefund' } } },
      ]),
      SaleReturn.aggregate([
        { $match: { owner, createdAt: { $gte: monthStart } } },
        { $group: { _id: { $dayOfMonth: '$createdAt' }, total: { $sum: '$totalRefund' } } },
      ]),
    ]);

    const todayGross = todaySales[0]?.total || 0;
    const todayReturnsTotal = todayReturns[0]?.total || 0;
    const monthlyGross = monthlySales[0]?.total || 0;
    const monthlyReturnsTotal = monthlyReturns[0]?.total || 0;

    const returnsByDay = new Map<number, number>(
      monthlyReturnsByDayAgg.map((r) => [r._id, r.total])
    );
    const monthlyRevenue = monthlyRevenueAgg.map((r) => ({
      _id: r._id,
      revenue: r.revenue - (returnsByDay.get(r._id) || 0),
      count: r.count,
    }));

    res.json({
      success: true,
      message: 'Dashboard data fetched.',
      data: {
        todaySales: {
          amount: todayGross - todayReturnsTotal,
          grossAmount: todayGross,
          returnsAmount: todayReturnsTotal,
          count: todaySales[0]?.count || 0,
        },
        monthlySales: {
          amount: monthlyGross - monthlyReturnsTotal,
          grossAmount: monthlyGross,
          returnsAmount: monthlyReturnsTotal,
          count: monthlySales[0]?.count || 0,
        },
        totalMedicines,
        lowStock,
        expiredMedicines,
        expiringSoon30,
        expiringSoon60,
        recentSales,
        monthlyRevenue,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard data.' });
  }
};
