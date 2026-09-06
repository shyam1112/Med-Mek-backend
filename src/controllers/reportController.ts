import { Response } from 'express';
import { Types } from 'mongoose';
import Sale from '../models/Sale';
import SaleReturn from '../models/SaleReturn';
import Purchase from '../models/Purchase';
import Medicine from '../models/Medicine';
import { AuthRequest } from '../types';
import { parseReportDateRange } from '../utils/helpers';

// ── Response shape contract ──────────────────────────────────────────────────
// Every report handler below returns `{ summary: {...}, <arrayKey>: [...], ... }`
// where every value is a plain, flat, display-ready field — no Mongo `_id`,
// `owner`, `__v`, populated refs, or nested documents. The frontend derives its
// section list, table columns, and Excel/CSV tabs straight from these object
// keys (humanized) and array-of-object shapes, so a field renamed or added here
// shows up in the UI automatically. Keep names self-descriptive: they ARE the
// UI labels once humanized (e.g. `totalStockValue` → "Total Stock Value").
// The key order in each returned object is also the on-screen/export order —
// `summary` first, then the primary detail table, then supporting breakdowns.

interface GroupAccumulator {
  [key: string]: Record<string, number>;
}

// Generic "group rows by a key and sum some numeric fields" helper — used to build
// every breakdown (payment mode, GST rate, category, supplier, medicine, expiry bucket)
// from data already pulled out of Mongo, instead of a bespoke aggregation per breakdown.
// Returns `{ key, ...sums }`; call sites rename `key` to a self-descriptive field name.
interface GroupedRow {
  key: string;
  [field: string]: string | number;
}

const groupBy = <T>(
  rows: T[],
  keyFn: (row: T) => string,
  sums: Record<string, (row: T) => number>
): GroupedRow[] => {
  const acc: GroupAccumulator = {};
  for (const row of rows) {
    const key = keyFn(row) || 'Unspecified';
    if (!acc[key]) {
      acc[key] = {};
      Object.keys(sums).forEach((field) => { acc[key][field] = 0; });
    }
    Object.entries(sums).forEach(([field, fn]) => { acc[key][field] += fn(row) || 0; });
  }
  return Object.entries(acc).map(([key, values]) => ({ key, ...values }));
};

// Rename the generic `key` field groupBy() produces to a self-descriptive name,
// keeping the rest of the row's fields in place.
const renameKey = (
  rows: Array<Record<string, unknown>>,
  fieldName: string
): Array<Record<string, unknown>> =>
  rows.map(({ key, ...rest }) => ({ [fieldName]: key, ...rest }));

const getCategoryMap = async (owner: Types.ObjectId): Promise<Map<string, string>> => {
  const medicines = await Medicine.find({ owner }, { category: 1 }).lean();
  return new Map(medicines.map((m) => [String(m._id), m.category]));
};

const getHsnMap = async (
  owner: Types.ObjectId
): Promise<Map<string, { hsnCode: string; unitOfMeasure: string }>> => {
  const medicines = await Medicine.find({ owner }, { hsnCode: 1, unitOfMeasure: 1 }).lean();
  return new Map(medicines.map((m) => [
    String(m._id),
    { hsnCode: m.hsnCode || 'Not Set', unitOfMeasure: m.unitOfMeasure || 'Strip' },
  ]));
};

const expiryBucket = (expiryDate: Date | undefined, now: Date): string => {
  if (!expiryDate) return 'No expiry set';
  const days = Math.ceil((new Date(expiryDate).getTime() - now.getTime()) / 86400000);
  if (days < 0) return 'Expired';
  if (days <= 30) return 'Critical (≤30 days)';
  if (days <= 60) return 'Warning (31–60 days)';
  if (days <= 90) return 'Watch (61–90 days)';
  return 'Healthy (90+ days)';
};

export const getDailySalesReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const owner = new Types.ObjectId(req.userId);
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    const start = new Date(date.setHours(0, 0, 0, 0));
    const end = new Date(date.setHours(23, 59, 59, 999));

    const [sales, summaryAgg, returnsAgg] = await Promise.all([
      Sale.find({ owner, saleDate: { $gte: start, $lte: end } }).sort({ saleDate: -1 }),
      Sale.aggregate([
        { $match: { owner, saleDate: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            gstAmount: { $sum: '$gstAmount' },
            totalDiscount: { $sum: '$discountAmount' },
            totalBills: { $sum: 1 },
          },
        },
      ]),
      // Returns netted by the day they were processed, not the original sale date.
      SaleReturn.aggregate([
        { $match: { owner, createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, totalReturns: { $sum: '$totalRefund' } } },
      ]),
    ]);

    const bills = sales.map((s) => ({
      billNumber: s.billNumber,
      customerName: s.customerName,
      totalAmount: s.totalAmount,
      paymentMode: s.paymentMode.toUpperCase(),
      saleDate: s.saleDate,
    }));

    const itemsSold = sales.flatMap((s) =>
      s.items.map((i) => ({
        billNumber: s.billNumber,
        saleDate: s.saleDate,
        medicineName: i.medicineName,
        batchNumber: i.batchNumber,
        manufacturer: i.manufacturer,
        quantity: i.quantity,
        sellingPrice: i.sellingPrice,
        gstPercentage: i.gstPercentage,
        discount: i.discount,
        totalAmount: i.totalAmount,
      }))
    );

    const paymentBreakdown = renameKey(
      groupBy(sales, (s) => s.paymentMode.toUpperCase(), { totalBills: () => 1, totalAmount: (s) => s.totalAmount }),
      'paymentMode'
    );

    const gstBreakdown = renameKey(
      groupBy(
        itemsSold, (i) => `${i.gstPercentage}%`,
        {
          taxableValue: (i) => i.quantity * i.sellingPrice - i.discount,
          gstAmount: (i) => (i.quantity * i.sellingPrice - i.discount) * i.gstPercentage / 100,
        }
      ).map((row) => ({ ...row, cgstAmount: (row.gstAmount as number) / 2, sgstAmount: (row.gstAmount as number) / 2 })),
      'gstRate'
    );

    const topMedicines = renameKey(
      groupBy(itemsSold, (i) => i.medicineName, { quantitySold: (i) => i.quantity, revenue: (i) => i.totalAmount })
        .sort((a, b) => (b.revenue as number) - (a.revenue as number)),
      'medicineName'
    );

    const grossRevenue = summaryAgg[0]?.totalRevenue || 0;
    const totalReturns = returnsAgg[0]?.totalReturns || 0;

    res.json({
      success: true,
      data: {
        summary: summaryAgg[0]
          ? {
              totalRevenue: grossRevenue,
              totalReturns,
              netRevenue: grossRevenue - totalReturns,
              totalBills: summaryAgg[0].totalBills,
              gstAmount: summaryAgg[0].gstAmount,
              totalDiscount: summaryAgg[0].totalDiscount,
            }
          : { totalRevenue: 0, totalReturns: 0, netRevenue: 0, totalBills: 0, gstAmount: 0, totalDiscount: 0 },
        bills,
        itemsSold,
        paymentBreakdown,
        gstBreakdown,
        topMedicines,
      },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to generate report.' });
  }
};

export const getMonthlySalesReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const owner = new Types.ObjectId(req.userId);
    const year = parseInt((req.query.year as string) || String(new Date().getFullYear()), 10);
    const month = parseInt((req.query.month as string) || String(new Date().getMonth() + 1), 10);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const [sales, dailyAgg, summaryAgg, categoryMap, returnsAgg, dailyReturnsAgg] = await Promise.all([
      Sale.find({ owner, saleDate: { $gte: start, $lte: end } }),
      Sale.aggregate([
        { $match: { owner, saleDate: { $gte: start, $lte: end } } },
        { $group: { _id: { $dayOfMonth: '$saleDate' }, revenue: { $sum: '$totalAmount' }, bills: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Sale.aggregate([
        { $match: { owner, saleDate: { $gte: start, $lte: end } } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, totalBills: { $sum: 1 } } },
      ]),
      getCategoryMap(owner),
      // Returns netted by the day they were processed, not the original sale date.
      SaleReturn.aggregate([
        { $match: { owner, createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, totalReturns: { $sum: '$totalRefund' } } },
      ]),
      SaleReturn.aggregate([
        { $match: { owner, createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: { $dayOfMonth: '$createdAt' }, totalReturns: { $sum: '$totalRefund' } } },
      ]),
    ]);

    const returnsByDay = new Map<number, number>(dailyReturnsAgg.map((r) => [r._id, r.totalReturns]));
    const dailyBreakdown = dailyAgg.map((r) => ({
      day: r._id,
      revenue: r.revenue,
      returns: returnsByDay.get(r._id) || 0,
      netRevenue: r.revenue - (returnsByDay.get(r._id) || 0),
      bills: r.bills,
    }));

    const paymentBreakdown = renameKey(
      groupBy(sales, (s) => s.paymentMode.toUpperCase(), { totalBills: () => 1, totalAmount: (s) => s.totalAmount }),
      'paymentMode'
    );

    // Explicit field list — not `{ ...i }` — because `i` is a Mongoose subdocument
    // and a plain spread does not reliably copy its schema-defined fields.
    const items = sales.flatMap((s) =>
      s.items.map((i) => ({ medicine: i.medicine, medicineName: i.medicineName, quantity: i.quantity, totalAmount: i.totalAmount }))
    );

    const topMedicines = renameKey(
      groupBy(items, (i) => i.medicineName, { quantitySold: (i) => i.quantity, revenue: (i) => i.totalAmount })
        .sort((a, b) => (b.revenue as number) - (a.revenue as number)),
      'medicineName'
    );

    const categoryBreakdown = renameKey(
      groupBy(items, (i) => categoryMap.get(String(i.medicine)) || 'Uncategorized', {
        quantitySold: (i) => i.quantity, revenue: (i) => i.totalAmount,
      }).sort((a, b) => (b.revenue as number) - (a.revenue as number)),
      'category'
    );

    const grossRevenue = summaryAgg[0]?.totalRevenue || 0;
    const totalReturns = returnsAgg[0]?.totalReturns || 0;

    res.json({
      success: true,
      data: {
        summary: summaryAgg[0]
          ? {
              totalRevenue: grossRevenue,
              totalReturns,
              netRevenue: grossRevenue - totalReturns,
              totalBills: summaryAgg[0].totalBills,
            }
          : { totalRevenue: 0, totalReturns: 0, netRevenue: 0, totalBills: 0 },
        dailyBreakdown,
        paymentBreakdown,
        topMedicines,
        categoryBreakdown,
      },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to generate report.' });
  }
};

export const getProfitReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const owner = new Types.ObjectId(req.userId);
    const { startDate, endDate } = req.query;
    const { start, end } = parseReportDateRange(startDate as string, endDate as string);

    const [[result], [returnTotals]] = await Promise.all([
      Sale.aggregate([
        { $match: { owner, saleDate: { $gte: start, $lte: end } } },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'medicines',
            localField: 'items.medicine',
            foreignField: '_id',
            as: 'medicineData',
          },
        },
        { $unwind: { path: '$medicineData', preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            itemRevenue: '$items.totalAmount',
            itemCost: { $multiply: ['$items.quantity', { $ifNull: ['$medicineData.purchasePrice', 0] }] },
            itemCategory: { $ifNull: ['$medicineData.category', 'Uncategorized'] },
          },
        },
        {
          $facet: {
            totals: [
              { $group: { _id: null, totalRevenue: { $sum: '$itemRevenue' }, totalCost: { $sum: '$itemCost' } } },
            ],
            byMedicine: [
              {
                $group: {
                  _id: '$items.medicineName',
                  quantitySold: { $sum: '$items.quantity' },
                  revenue: { $sum: '$itemRevenue' },
                  cost: { $sum: '$itemCost' },
                },
              },
              { $sort: { revenue: -1 } },
            ],
            byCategory: [
              {
                $group: {
                  _id: '$itemCategory',
                  quantitySold: { $sum: '$items.quantity' },
                  revenue: { $sum: '$itemRevenue' },
                  cost: { $sum: '$itemCost' },
                },
              },
              { $sort: { revenue: -1 } },
            ],
          },
        },
      ]),
      // Returned units go back into stock unsold, so both the refunded revenue
      // and its cost of goods are backed out of the period's profit — netted
      // by the day the return was processed, not the original sale date.
      // Faceted the same way as the sales side so byMedicine/byCategory below
      // can be netted too, not just the top-level summary — otherwise the
      // per-item breakdown wouldn't reconcile against the summary figures.
      SaleReturn.aggregate([
        { $match: { owner, createdAt: { $gte: start, $lte: end } } },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'medicines',
            localField: 'items.medicine',
            foreignField: '_id',
            as: 'medicineData',
          },
        },
        { $unwind: { path: '$medicineData', preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            itemReturnCost: { $multiply: ['$items.quantity', { $ifNull: ['$medicineData.purchasePrice', 0] }] },
            itemCategory: { $ifNull: ['$medicineData.category', 'Uncategorized'] },
          },
        },
        {
          $facet: {
            totals: [
              { $group: { _id: null, totalReturnRevenue: { $sum: '$items.refundAmount' }, totalReturnCost: { $sum: '$itemReturnCost' } } },
            ],
            byMedicine: [
              { $group: { _id: '$items.medicineName', returnRevenue: { $sum: '$items.refundAmount' }, returnCost: { $sum: '$itemReturnCost' } } },
            ],
            byCategory: [
              { $group: { _id: '$itemCategory', returnRevenue: { $sum: '$items.refundAmount' }, returnCost: { $sum: '$itemReturnCost' } } },
            ],
          },
        },
      ]),
    ]);

    const totals = result?.totals?.[0] || { totalRevenue: 0, totalCost: 0 };
    const returns = returnTotals?.totals?.[0] || { totalReturnRevenue: 0, totalReturnCost: 0 };
    const netRevenue = totals.totalRevenue - returns.totalReturnRevenue;
    const netCost = totals.totalCost - returns.totalReturnCost;
    const grossProfit = netRevenue - netCost;
    const profitMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

    const returnMap = (rows: Array<{ _id: string; returnRevenue: number; returnCost: number }>) =>
      new Map(rows.map((r) => [r._id || 'Unspecified', r]));
    const returnsByMedicine = returnMap(returnTotals?.byMedicine || []);
    const returnsByCategory = returnMap(returnTotals?.byCategory || []);

    const withMargin = (fieldName: string, returnLookup: Map<string, { returnRevenue: number; returnCost: number }>) =>
      (rows: Array<{ _id: string; quantitySold: number; revenue: number; cost: number }>) =>
        rows.map(({ _id, quantitySold, revenue, cost }) => {
          const key = _id || 'Unspecified';
          const ret = returnLookup.get(key) || { returnRevenue: 0, returnCost: 0 };
          const netItemRevenue = revenue - ret.returnRevenue;
          const netItemCost = cost - ret.returnCost;
          return {
            [fieldName]: key,
            quantitySold,
            revenue: netItemRevenue,
            cost: netItemCost,
            profit: netItemRevenue - netItemCost,
            profitMargin: netItemRevenue > 0 ? ((netItemRevenue - netItemCost) / netItemRevenue) * 100 : 0,
          };
        });

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue: totals.totalRevenue,
          totalReturns: returns.totalReturnRevenue,
          netRevenue,
          totalCost: netCost,
          grossProfit,
          profitMargin,
        },
        byMedicine: withMargin('medicineName', returnsByMedicine)(result?.byMedicine || []),
        byCategory: withMargin('category', returnsByCategory)(result?.byCategory || []),
      },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to generate profit report.' });
  }
};

export const getPurchaseReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const owner = new Types.ObjectId(req.userId);
    const { startDate, endDate } = req.query;
    const { start, end } = parseReportDateRange(startDate as string, endDate as string);

    const [purchases, summaryAgg] = await Promise.all([
      Purchase.find({ owner, purchaseDate: { $gte: start, $lte: end } }).sort({ purchaseDate: -1 }),
      Purchase.aggregate([
        { $match: { owner, purchaseDate: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$totalAmount' },
            totalPaid: { $sum: '$paidAmount' },
            totalBalance: { $sum: '$balanceAmount' },
            totalPurchaseOrders: { $sum: 1 },
          },
        },
      ]),
    ]);

    const purchaseOrders = purchases.map((p) => ({
      invoiceNumber: p.invoiceNumber,
      purchaseDate: p.purchaseDate,
      supplierName: p.supplierName,
      totalAmount: p.totalAmount,
      paidAmount: p.paidAmount,
      balanceAmount: p.balanceAmount,
    }));

    const itemsPurchased = purchases.flatMap((p) =>
      p.items.map((i) => ({
        invoiceNumber: p.invoiceNumber,
        purchaseDate: p.purchaseDate,
        supplierName: p.supplierName,
        medicineName: i.medicineName,
        batchNumber: i.batchNumber,
        expiryDate: i.expiryDate,
        quantity: i.quantity,
        purchasePrice: i.purchasePrice,
        gstPercentage: i.gstPercentage,
        totalAmount: i.totalAmount,
      }))
    );

    const bySupplier = renameKey(
      groupBy(purchases, (p) => p.supplierName, {
        totalOrders: () => 1, totalAmount: (p) => p.totalAmount, totalPaid: (p) => p.paidAmount, totalBalance: (p) => p.balanceAmount,
      }).sort((a, b) => (b.totalAmount as number) - (a.totalAmount as number)),
      'supplierName'
    );

    res.json({
      success: true,
      data: {
        summary: summaryAgg[0]
          ? { totalPurchaseOrders: summaryAgg[0].totalPurchaseOrders, totalAmount: summaryAgg[0].totalAmount, totalPaid: summaryAgg[0].totalPaid, totalBalance: summaryAgg[0].totalBalance }
          : { totalPurchaseOrders: 0, totalAmount: 0, totalPaid: 0, totalBalance: 0 },
        purchaseOrders,
        itemsPurchased,
        bySupplier,
      },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to generate purchase report.' });
  }
};

export const getInventoryReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const owner = new Types.ObjectId(req.userId);
    const now = new Date();

    const [medicinesRaw, summaryAgg] = await Promise.all([
      Medicine.find({ owner, isActive: true }).sort({ name: 1 }),
      Medicine.aggregate([
        { $match: { owner, isActive: true } },
        {
          $group: {
            _id: null,
            totalMedicines: { $sum: 1 },
            totalStockValue: { $sum: { $multiply: ['$currentStock', '$purchasePrice'] } },
            totalSellingValue: { $sum: { $multiply: ['$currentStock', '$sellingPrice'] } },
            lowStockCount: { $sum: { $cond: [{ $lte: ['$currentStock', '$minimumStockLevel'] }, 1, 0] } },
            outOfStockCount: { $sum: { $cond: [{ $eq: ['$currentStock', 0] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const medicines = medicinesRaw.map((m) => ({
      name: m.name,
      category: m.category,
      currentStock: m.currentStock,
      purchasePrice: m.purchasePrice,
      sellingPrice: m.sellingPrice,
      stockValue: m.currentStock * m.purchasePrice,
    }));

    const byCategory = renameKey(
      groupBy(medicinesRaw, (m) => m.category, {
        medicineCount: () => 1,
        stockValue: (m) => m.currentStock * m.purchasePrice,
        sellingValue: (m) => m.currentStock * m.sellingPrice,
        lowStockCount: (m) => (m.currentStock <= m.minimumStockLevel ? 1 : 0),
      }).sort((a, b) => (b.stockValue as number) - (a.stockValue as number)),
      'category'
    );

    const byExpiryStatus = renameKey(
      groupBy(medicinesRaw, (m) => expiryBucket(m.expiryDate, now), {
        medicineCount: () => 1, stockValue: (m) => m.currentStock * m.purchasePrice,
      }),
      'expiryStatus'
    );

    res.json({
      success: true,
      data: {
        summary: summaryAgg[0]
          ? { totalMedicines: summaryAgg[0].totalMedicines, totalStockValue: summaryAgg[0].totalStockValue, totalSellingValue: summaryAgg[0].totalSellingValue, lowStockCount: summaryAgg[0].lowStockCount, outOfStockCount: summaryAgg[0].outOfStockCount }
          : { totalMedicines: 0, totalStockValue: 0, totalSellingValue: 0, lowStockCount: 0, outOfStockCount: 0 },
        medicines,
        byCategory,
        byExpiryStatus,
      },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to generate inventory report.' });
  }
};

export const getExpiryLossReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const owner = req.userId;
    const now = new Date();
    const expiredMedicinesRaw = await Medicine.find({
      owner,
      isActive: true,
      expiryDate: { $lt: now },
      currentStock: { $gt: 0 },
    });

    const totalLoss = expiredMedicinesRaw.reduce((sum, m) => sum + m.currentStock * m.purchasePrice, 0);

    const expiredMedicines = expiredMedicinesRaw.map((m) => ({
      name: m.name,
      category: m.category,
      batchNumber: m.batchNumber,
      expiryDate: m.expiryDate,
      currentStock: m.currentStock,
      loss: m.currentStock * m.purchasePrice,
    }));

    const byCategory = renameKey(
      groupBy(expiredMedicinesRaw, (m) => m.category, {
        medicineCount: () => 1, loss: (m) => m.currentStock * m.purchasePrice,
      }).sort((a, b) => (b.loss as number) - (a.loss as number)),
      'category'
    );

    res.json({
      success: true,
      data: {
        summary: { expiredMedicineCount: expiredMedicinesRaw.length, totalLoss },
        expiredMedicines,
        byCategory,
      },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to generate expiry loss report.' });
  }
};

export const getDoctorWiseSalesReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const owner = new Types.ObjectId(req.userId);
    const { startDate, endDate } = req.query;
    const { start, end } = parseReportDateRange(startDate as string, endDate as string);

    // Only sales with a doctor on file count as "referred" — walk-ins with no
    // doctor noted are excluded rather than bucketed as "Unspecified", since
    // that's not a referral at all.
    const [referredSales, returnsAgg] = await Promise.all([
      Sale.find({ owner, saleDate: { $gte: start, $lte: end }, doctorName: { $ne: '' } }),
      // Returns netted by the day they were processed, not the original sale
      // date — attributed to whichever doctor was on the original sale.
      SaleReturn.aggregate([
        { $match: { owner, createdAt: { $gte: start, $lte: end } } },
        { $lookup: { from: 'sales', localField: 'sale', foreignField: '_id', as: 'saleData' } },
        { $unwind: '$saleData' },
        { $match: { 'saleData.doctorName': { $ne: '' } } },
        { $group: { _id: '$saleData.doctorName', totalReturns: { $sum: '$totalRefund' } } },
      ]),
    ]);

    const returnsByDoctor = new Map<string, number>(returnsAgg.map((r) => [r._id, r.totalReturns]));

    const byDoctor = renameKey(
      groupBy(referredSales, (s) => s.doctorName, {
        totalBills: () => 1,
        totalRevenue: (s) => s.totalAmount,
      }),
      'doctorName'
    )
      .map((row) => {
        const totalReturns = returnsByDoctor.get(row.doctorName as string) || 0;
        return { ...row, totalReturns, netRevenue: (row.totalRevenue as number) - totalReturns };
      })
      .sort((a, b) => (b.netRevenue as number) - (a.netRevenue as number));

    const grossReferredRevenue = referredSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalReturns = returnsAgg.reduce((sum, r) => sum + r.totalReturns, 0);

    res.json({
      success: true,
      data: {
        summary: {
          totalDoctors: byDoctor.length,
          totalReferredBills: referredSales.length,
          totalReferredRevenue: grossReferredRevenue,
          totalReturns,
          netReferredRevenue: grossReferredRevenue - totalReturns,
        },
        byDoctor,
      },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to generate doctor-wise sales report.' });
  }
};

interface HsnItem {
  hsnCode: string;
  unitOfMeasure: string;
  medicineName: string;
  gstPercentage: number;
  quantity: number;
  taxableValue: number;
  totalValue: number;
}

export const getHsnSummaryReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const owner = new Types.ObjectId(req.userId);
    const { startDate, endDate } = req.query;
    const { start, end } = parseReportDateRange(startDate as string, endDate as string);

    const [sales, returns, hsnMap] = await Promise.all([
      Sale.find({ owner, saleDate: { $gte: start, $lte: end } }),
      // Returns netted by the day they were processed, not the original sale
      // date — same convention as the Daily/Monthly/Profit reports.
      SaleReturn.find({ owner, createdAt: { $gte: start, $lte: end } }),
      getHsnMap(owner),
    ]);

    const items: HsnItem[] = sales.flatMap((s) =>
      s.items.map((i) => {
        const meta = hsnMap.get(String(i.medicine)) || { hsnCode: 'Not Set', unitOfMeasure: 'Strip' };
        return {
          hsnCode: meta.hsnCode,
          unitOfMeasure: meta.unitOfMeasure,
          medicineName: i.medicineName,
          gstPercentage: i.gstPercentage,
          quantity: i.quantity,
          taxableValue: i.quantity * i.sellingPrice - i.discount,
          totalValue: i.totalAmount,
        };
      })
    );

    // Return line items have no separate discount field — refundAmount is
    // already the net (post-discount) amount refunded — so the taxable value
    // is backed out of it the same way itemGST is derived on the sale side.
    const returnItems: HsnItem[] = returns.flatMap((r) =>
      r.items.map((i) => {
        const meta = hsnMap.get(String(i.medicine)) || { hsnCode: 'Not Set', unitOfMeasure: 'Strip' };
        return {
          hsnCode: meta.hsnCode,
          unitOfMeasure: meta.unitOfMeasure,
          medicineName: i.medicineName,
          gstPercentage: i.gstPercentage,
          quantity: i.quantity,
          taxableValue: i.refundAmount / (1 + i.gstPercentage / 100),
          totalValue: i.refundAmount,
        };
      })
    );

    // Grouped by HSN code + GST rate — GSTR-1's HSN Summary is one row per
    // HSN-code-per-rate, not just per HSN code (two products sharing an HSN
    // code but taxed at different rates must appear as separate rows).
    const rowKey = (i: HsnItem) => `${i.hsnCode}__${i.gstPercentage}`;

    // UQC and a representative description are deterministic per HSN-code+rate
    // row — keyed the same way as the grouping itself, so a second product
    // sharing an HSN code at a different rate doesn't inherit the first
    // product's unit/description.
    const rowMeta = new Map<string, { unitOfMeasure: string; description: string }>();
    items.forEach((i) => {
      const key = rowKey(i);
      if (!rowMeta.has(key)) {
        rowMeta.set(key, { unitOfMeasure: i.unitOfMeasure, description: i.medicineName });
      }
    });

    const grouped = groupBy(items, rowKey, {
      totalQuantity: (i) => i.quantity,
      taxableValue: (i) => i.taxableValue,
      totalValue: (i) => i.totalValue,
    });

    const returnsByRow = new Map(
      groupBy(returnItems, rowKey, {
        totalQuantity: (i) => i.quantity,
        taxableValue: (i) => i.taxableValue,
        totalValue: (i) => i.totalValue,
      }).map((r) => [r.key, r])
    );

    const hsnSummary = grouped
      .map(({ key, ...sums }) => {
        const [hsnCode, gstStr] = key.split('__');
        const gstPercentage = Number(gstStr);
        const ret = returnsByRow.get(key);
        const totalQuantity = (sums.totalQuantity as number) - ((ret?.totalQuantity as number) || 0);
        const taxableValue = (sums.taxableValue as number) - ((ret?.taxableValue as number) || 0);
        const totalValue = (sums.totalValue as number) - ((ret?.totalValue as number) || 0);
        // Intra-state sale assumed (same convention used for invoices elsewhere
        // in this app) — GST splits evenly into CGST + SGST.
        const cgstAmount = Math.round(((taxableValue * gstPercentage) / 200) * 100) / 100;
        const sgstAmount = cgstAmount;
        return {
          hsnCode,
          description: rowMeta.get(key)?.description || '',
          uqc: rowMeta.get(key)?.unitOfMeasure || 'Strip',
          gstRate: `${gstPercentage}%`,
          totalQuantity,
          taxableValue,
          cgstAmount,
          sgstAmount,
          totalValue,
        };
      })
      .sort((a, b) => (b.totalValue as number) - (a.totalValue as number));

    const round2 = (n: number) => Math.round(n * 100) / 100;

    const summary = {
      totalHsnCodes: new Set(hsnSummary.map((r) => r.hsnCode)).size,
      totalTaxableValue: round2(hsnSummary.reduce((sum, r) => sum + r.taxableValue, 0)),
      totalTax: round2(hsnSummary.reduce((sum, r) => sum + r.cgstAmount + r.sgstAmount, 0)),
      totalInvoiceValue: round2(hsnSummary.reduce((sum, r) => sum + (r.totalValue as number), 0)),
      totalReturns: round2(returnItems.reduce((sum, i) => sum + i.totalValue, 0)),
    };

    res.json({ success: true, data: { summary, hsnSummary } });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to generate HSN summary report.' });
  }
};
