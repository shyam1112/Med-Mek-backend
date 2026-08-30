import { Response } from 'express';
import Sale from '../models/Sale';
import SaleReturn from '../models/SaleReturn';
import Medicine from '../models/Medicine';
import Customer from '../models/Customer';
import StockTransaction from '../models/StockTransaction';
import { AuthRequest } from '../types';

export const createReturn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const owner = req.userId;
    const { saleId, items, reason } = req.body;

    if (!saleId || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'Sale and at least one returned item are required.' });
      return;
    }

    const sale = await Sale.findOne({ _id: saleId, owner });
    if (!sale) {
      res.status(404).json({ success: false, message: 'Sale not found.' });
      return;
    }

    // Sum quantities already returned per medicine, across every prior return
    // against this bill, so a second (or third) partial return can't exceed
    // what was actually sold.
    const previousReturns = await SaleReturn.find({ sale: sale._id, owner });
    const alreadyReturned = new Map<string, number>();
    previousReturns.forEach((r) => {
      r.items.forEach((i) => {
        const key = String(i.medicine);
        alreadyReturned.set(key, (alreadyReturned.get(key) || 0) + i.quantity);
      });
    });

    let totalRefund = 0;
    const returnItems: Array<{
      medicine: typeof sale.items[number]['medicine'];
      medicineName: string; quantity: number; sellingPrice: number; gstPercentage: number; refundAmount: number;
    }> = [];

    for (const reqItem of items) {
      const quantity = Number(reqItem.quantity);
      if (!quantity || quantity <= 0) continue;

      const saleItem = sale.items.find((i) => String(i.medicine) === String(reqItem.medicineId));
      if (!saleItem) {
        res.status(400).json({ success: false, message: `Item not found on this bill: ${reqItem.medicineId}` });
        return;
      }

      // Expired stock can't be taken back as a return — check against the batch's
      // actual expiry date at the time of sale, not today's Medicine record (which
      // may since have been restocked with a different batch/expiry).
      if (saleItem.expiryDate && new Date(saleItem.expiryDate) < new Date()) {
        res.status(400).json({
          success: false,
          message: `Cannot return ${saleItem.medicineName} — this batch expired on ${new Date(saleItem.expiryDate).toLocaleDateString('en-IN')}.`,
        });
        return;
      }

      const returnedSoFar = alreadyReturned.get(String(saleItem.medicine)) || 0;
      const remaining = saleItem.quantity - returnedSoFar;
      if (quantity > remaining) {
        res.status(400).json({
          success: false,
          message: `Cannot return ${quantity} of ${saleItem.medicineName} — only ${remaining} remaining (${saleItem.quantity} sold, ${returnedSoFar} already returned).`,
        });
        return;
      }

      // Refund per unit uses the line's actual charged total (post-GST,
      // post-discount) divided by quantity, so a partial return refunds the
      // exact proportional amount the customer actually paid for those units.
      const unitRefund = saleItem.totalAmount / saleItem.quantity;
      const refundAmount = Math.round(unitRefund * quantity * 100) / 100;
      totalRefund += refundAmount;

      returnItems.push({
        medicine: saleItem.medicine,
        medicineName: saleItem.medicineName,
        quantity,
        sellingPrice: saleItem.sellingPrice,
        gstPercentage: saleItem.gstPercentage,
        refundAmount,
      });
    }

    if (returnItems.length === 0) {
      res.status(400).json({ success: false, message: 'Enter a quantity to return for at least one item.' });
      return;
    }

    const saleReturn = await SaleReturn.create({
      owner,
      sale: sale._id,
      billNumber: sale.billNumber,
      items: returnItems,
      totalRefund: Math.round(totalRefund * 100) / 100,
      reason: reason?.trim() || '',
    });

    for (const item of returnItems) {
      const medicine = await Medicine.findOne({ _id: item.medicine, owner });
      if (medicine) {
        const previousStock = medicine.currentStock;
        medicine.currentStock += item.quantity;
        await medicine.save();

        await StockTransaction.create({
          owner,
          medicine: medicine._id,
          medicineName: medicine.name,
          transactionType: 'return',
          quantity: item.quantity,
          previousStock,
          newStock: medicine.currentStock,
          reference: sale.billNumber,
          referenceId: saleReturn._id,
          notes: `Return against ${sale.billNumber}`,
        });
      }
    }

    sale.totalReturned = (sale.totalReturned || 0) + saleReturn.totalRefund;
    await sale.save();

    if (sale.customer) {
      await Customer.findOneAndUpdate(
        { _id: sale.customer, owner },
        { $inc: { totalPurchases: -saleReturn.totalRefund } }
      );
    }

    res.status(201).json({ success: true, message: 'Return processed.', data: saleReturn });
  } catch (err) {
    console.error('[createReturn]', err);
    res.status(500).json({ success: false, message: 'Failed to process return.' });
  }
};

export const getReturnsForSale = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { saleId } = req.query;
    if (!saleId) {
      res.status(400).json({ success: false, message: 'saleId is required.' });
      return;
    }
    const returns = await SaleReturn.find({ owner: req.userId, sale: saleId }).sort({ createdAt: -1 });
    res.json({ success: true, data: returns });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch returns.' });
  }
};
