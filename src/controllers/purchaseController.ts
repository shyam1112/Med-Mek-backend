import { Response } from 'express';
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
  try {
    const { supplierId, items, paidAmount, notes, purchaseDate } = req.body;
    const owner = req.userId;

    const supplier = await Supplier.findOne({ _id: supplierId, owner });
    if (!supplier) {
      res.status(404).json({ success: false, message: 'Supplier not found.' });
      return;
    }

    let subtotal = 0;
    let gstAmount = 0;
    const enrichedItems = [];

    for (const item of items) {
      let medicine;

      if (item.medicineId) {
        // Existing medicine in inventory
        medicine = await Medicine.findOne({ _id: item.medicineId, owner });
        if (!medicine) {
          res.status(404).json({ success: false, message: `Medicine not found: ${item.medicineId}` });
          return;
        }
      } else if (item.newMedicine) {
        // New medicine — create it now with stock 0 (purchase loop below will add stock)
        medicine = await Medicine.create({
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
        });
        // Attach the new ID so the stock-update loop below can find it
        item.medicineId = medicine._id.toString();
      } else {
        res.status(400).json({ success: false, message: 'Each item must have a medicineId or newMedicine data.' });
        return;
      }

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

    const purchase = await Purchase.create({
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
    });

    // Update stock and create transactions
    for (const item of items) {
      const medicine = await Medicine.findOne({ _id: item.medicineId, owner });
      if (medicine) {
        const previousStock = medicine.currentStock;
        medicine.currentStock += item.quantity;
        if (item.batchNumber) medicine.batchNumber = item.batchNumber;
        if (item.expiryDate) medicine.expiryDate = new Date(item.expiryDate);
        medicine.purchasePrice = item.purchasePrice;
        await medicine.save();

        await StockTransaction.create({
          owner,
          medicine: medicine._id,
          medicineName: medicine.name,
          transactionType: 'purchase',
          quantity: item.quantity,
          previousStock,
          newStock: medicine.currentStock,
          reference: purchase.invoiceNumber,
          referenceId: purchase._id,
          notes: `Purchase Order: ${purchase.invoiceNumber}`,
        });
      }
    }

    // Update supplier outstanding balance
    if (balance > 0) {
      supplier.outstandingBalance += balance;
      await supplier.save();
    }

    res.status(201).json({ success: true, message: 'Purchase created.', data: purchase });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create purchase.';
    console.error('[createPurchase]', msg);
    res.status(500).json({ success: false, message: msg });
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
