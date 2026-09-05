import { Response } from 'express';
import mongoose from 'mongoose';
import Purchase from '../models/Purchase';
import Medicine from '../models/Medicine';
import Supplier from '../models/Supplier';
import StockTransaction from '../models/StockTransaction';
import { AuthRequest } from '../types';
import { getPaginationParams, generateInvoiceNumber } from '../utils/helpers';

export const getPurchases = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query as Record<string, string>);
    const { supplier, paymentStatus, startDate, endDate } = req.query;

    const filter: Record<string, unknown> = { owner: req.userId };
    if (supplier) filter.supplier = supplier;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter.$gte = new Date(startDate as string);
      if (endDate) dateFilter.$lte = new Date(endDate as string);
      filter.purchaseDate = dateFilter;
    }

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
    res.status(500).json({ success: false, message: 'Failed to fetch purchases.' });
  }
};

export const getPurchaseById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const purchase = await Purchase.findOne({ _id: req.params.id, owner: req.userId }).populate('supplier');
    if (!purchase) {
      res.status(404).json({ success: false, message: 'Purchase not found.' });
      return;
    }
    res.json({ success: true, data: purchase });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch purchase.' });
  }
};

export const createPurchase = async (req: AuthRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  try {
    const { supplierId, items, paidAmount, notes, purchaseDate } = req.body;
    const owner = req.userId;

    let responsePurchase: InstanceType<typeof Purchase> | null = null;

    await session.withTransaction(async () => {
      const supplier = await Supplier.findOne({ _id: supplierId, owner }).session(session);
      if (!supplier) {
        throw Object.assign(new Error('Supplier not found.'), { statusCode: 404 });
      }

      let subtotal = 0;
      let gstAmount = 0;
      const enrichedItems = [];
      const stockEvents: {
        medicineId: unknown; medicineName: string; quantity: number; previousStock: number; newStock: number;
      }[] = [];
      // A pack received from a supplier (e.g. "10 strips") adds
      // quantity * unitsPerPack individual units to stock — captured here
      // while `medicine` is in scope, used in the stock-update loop below.
      const unitsPerPackByMedicineId = new Map<string, number>();

      for (const item of items) {
        let medicine;

        if (item.medicineId) {
          // Existing medicine in inventory
          medicine = await Medicine.findOne({ _id: item.medicineId, owner }).session(session);
          if (!medicine) {
            throw Object.assign(new Error(`Medicine not found: ${item.medicineId}`), { statusCode: 404 });
          }
        } else if (item.newMedicine) {
          // New medicine — create it now with stock 0 (stock-update loop below will add stock)
          [medicine] = await Medicine.create(
            [{
              owner,
              name: item.newMedicine.name,
              genericName: item.newMedicine.genericName || '',
              category: item.newMedicine.category || 'Other',
              manufacturer: item.newMedicine.manufacturer || '',
              dosageForm: item.newMedicine.dosageForm || '',
              strength: item.newMedicine.strength || '',
              packSize: item.newMedicine.packSize || '',
              barcode: item.newMedicine.barcode || '',
              hsnCode: item.newMedicine.hsnCode || '',
              scheduleClass: item.newMedicine.scheduleClass || 'None',
              unitOfMeasure: item.newMedicine.unitOfMeasure || 'Strip',
              unitsPerPack: item.newMedicine.unitsPerPack || 1,
              storageCondition: item.newMedicine.storageCondition || '',
              location: item.newMedicine.location || '',
              batchNumber: item.batchNumber || '',
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
              purchasePrice: item.purchasePrice,
              sellingPrice: item.newMedicine.sellingPrice || item.purchasePrice,
              gstPercentage: item.gstPercentage ?? item.newMedicine.gstPercentage ?? 12,
              currentStock: 0,
              minimumStockLevel: item.newMedicine.minimumStockLevel ?? 10,
              isActive: true,
            }],
            { session }
          );
          // Attach the new ID so the stock-update loop below can find it
          item.medicineId = medicine._id.toString();
        } else {
          throw Object.assign(new Error('Each item must have a medicineId or newMedicine data.'), { statusCode: 400 });
        }

        unitsPerPackByMedicineId.set(item.medicineId, medicine.unitsPerPack || 1);

        const itemTotal = item.quantity * item.purchasePrice;
        const itemGST = (itemTotal * item.gstPercentage) / 100;
        subtotal += itemTotal;
        gstAmount += itemGST;

        const enrichedItem: Record<string, unknown> = {
          medicine: medicine._id,
          medicineName: medicine.name,
          batchNumber: item.batchNumber || medicine.batchNumber || '',
          quantity: item.quantity,
          purchasePrice: item.purchasePrice,
          gstPercentage: item.gstPercentage || medicine.gstPercentage,
          totalAmount: itemTotal + itemGST,
        };
        const expiryDate = item.expiryDate || medicine.expiryDate;
        if (expiryDate) enrichedItem.expiryDate = expiryDate;
        enrichedItems.push(enrichedItem);
      }

      const totalAmount = subtotal + gstAmount;
      const paid = paidAmount || 0;
      const balance = totalAmount - paid;
      const paymentStatus = balance <= 0 ? 'paid' : paid > 0 ? 'partial' : 'pending';
      const invoiceNumber = await generateInvoiceNumber(owner!);

      const [purchase] = await Purchase.create(
        [{
          owner,
          invoiceNumber,
          supplier: supplier._id,
          supplierName: supplier.name,
          purchaseDate: purchaseDate || new Date(),
          items: enrichedItems,
          subtotal,
          gstAmount,
          totalAmount,
          paidAmount: paid,
          balanceAmount: balance,
          paymentStatus,
          notes: notes || '',
        }],
        { session }
      );

      // Update stock atomically (each item's $inc is race-safe against concurrent
      // sales/purchases on the same medicine) and record the transaction trail.
      for (const item of items) {
        const updateFields: Record<string, unknown> = { purchasePrice: item.purchasePrice };
        if (item.batchNumber) updateFields.batchNumber = item.batchNumber;
        if (item.expiryDate) updateFields.expiryDate = new Date(item.expiryDate);

        // Purchases are placed in packs (e.g. "10 strips" from a supplier),
        // but stock is always counted in individual units — see
        // billingController.createSale for the matching per-unit side.
        const unitsPerPack = unitsPerPackByMedicineId.get(item.medicineId) || 1;
        const unitsReceived = item.quantity * unitsPerPack;

        const updated = await Medicine.findOneAndUpdate(
          { _id: item.medicineId, owner },
          { $inc: { currentStock: unitsReceived }, $set: updateFields },
          { new: true, session }
        );

        if (updated) {
          stockEvents.push({
            medicineId: updated._id,
            medicineName: updated.name,
            quantity: unitsReceived,
            previousStock: updated.currentStock - unitsReceived,
            newStock: updated.currentStock,
          });
        }
      }

      for (const evt of stockEvents) {
        await StockTransaction.create(
          [{
            owner,
            medicine: evt.medicineId,
            medicineName: evt.medicineName,
            transactionType: 'purchase',
            quantity: evt.quantity,
            previousStock: evt.previousStock,
            newStock: evt.newStock,
            reference: purchase.invoiceNumber,
            referenceId: purchase._id,
            notes: `Purchase Order: ${purchase.invoiceNumber}`,
          }],
          { session }
        );
      }

      // Update supplier outstanding balance
      if (balance > 0) {
        supplier.outstandingBalance += balance;
        await supplier.save({ session });
      }

      responsePurchase = purchase;
    });

    res.status(201).json({ success: true, message: 'Purchase created.', data: responsePurchase });
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    const msg = err instanceof Error ? err.message : 'Failed to create purchase.';
    console.error('[createPurchase]', msg);
    res.status(statusCode || 500).json({ success: false, message: msg });
  } finally {
    session.endSession();
  }
};

export const updatePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount } = req.body;
    const purchase = await Purchase.findOne({ _id: req.params.id, owner: req.userId });
    if (!purchase) {
      res.status(404).json({ success: false, message: 'Purchase not found.' });
      return;
    }

    const previousBalance = purchase.balanceAmount;
    purchase.paidAmount += Number(amount);
    purchase.balanceAmount = purchase.totalAmount - purchase.paidAmount;
    purchase.paymentStatus =
      purchase.balanceAmount <= 0 ? 'paid' : purchase.paidAmount > 0 ? 'partial' : 'pending';
    await purchase.save();

    // Update supplier balance
    const paid = Math.min(Number(amount), previousBalance);
    await Supplier.findOneAndUpdate(
      { _id: purchase.supplier, owner: req.userId },
      { $inc: { outstandingBalance: -paid } }
    );

    res.json({ success: true, message: 'Payment updated.', data: purchase });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to update payment.' });
  }
};
