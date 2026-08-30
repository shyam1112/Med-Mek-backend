import { Response } from 'express';
import Sale from '../models/Sale';
import Medicine from '../models/Medicine';
import Customer from '../models/Customer';
import Doctor from '../models/Doctor';
import StockTransaction from '../models/StockTransaction';
import { AuthRequest } from '../types';
import { getPaginationParams, generateBillNumber } from '../utils/helpers';

export const createSale = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      customerId, customerName, customerMobile, customerAddress, doctorId, doctorName,
      items, paymentMode, notes, discountAmount, cgstAmount, sgstAmount,
    } = req.body;
    const owner = req.userId;

    // A picked doctor is denormalized onto the sale (same pattern as
    // medicineName on sale items) so the bill still displays correctly even
    // if the doctor record is later edited or deactivated. Free-typed text
    // with no matching doctor record is still accepted as plain doctorName.
    const doctor = doctorId ? await Doctor.findOne({ _id: doctorId, owner }) : null;

    let customer = null;
    const realName = customerName?.trim();
    const realMobile = customerMobile?.trim();
    const realAddress = customerAddress?.trim();
    const isWalkin = !realName || realName === 'Walk-in Customer';

    if (customerId) {
      customer = await Customer.findOne({ _id: customerId, owner });
    } else if (!isWalkin) {
      // If mobile provided, try to find existing customer by mobile first (avoids duplicates)
      if (realMobile) {
        customer = await Customer.findOne({ mobile: realMobile, owner });
      }
      // Still no customer found — create one, capturing the address entered on
      // this bill so it isn't lost (previously discarded after only being used
      // for the printed invoice).
      if (!customer) {
        customer = await Customer.create({
          owner,
          name: realName,
          mobile: realMobile || '',
          address: realAddress || '',
          totalPurchases: 0,
        });
      }
    }

    // Backfill a missing address on an existing customer record from this bill,
    // rather than silently discarding it.
    if (customer && !customer.address && realAddress) {
      customer.address = realAddress;
      await customer.save();
    }

    let subtotal = 0;
    let totalGST = 0;
    const enrichedItems = [];

    for (const item of items) {
      const medicine = await Medicine.findOne({ _id: item.medicineId, owner });
      if (!medicine) {
        res.status(404).json({ success: false, message: `Medicine ${item.medicineId} not found.` });
        return;
      }
      if (medicine.currentStock < item.quantity) {
        res.status(400).json({
          success: false,
          message: `Insufficient stock for ${medicine.name}. Available: ${medicine.currentStock}`,
        });
        return;
      }

      const itemSubtotal = item.quantity * medicine.sellingPrice;
      const itemGST = (itemSubtotal * medicine.gstPercentage) / 100;
      const itemDiscount = item.discount || 0;
      const itemTotal = itemSubtotal + itemGST - itemDiscount;

      subtotal += itemSubtotal;
      totalGST += itemGST;

      enrichedItems.push({
        medicine: medicine._id,
        medicineName: medicine.name,
        manufacturer: medicine.manufacturer,
        packSize: medicine.packSize,
        batchNumber: medicine.batchNumber,
        expiryDate: medicine.expiryDate,
        quantity: item.quantity,
        sellingPrice: medicine.sellingPrice,
        gstPercentage: medicine.gstPercentage,
        discount: itemDiscount,
        totalAmount: itemTotal,
      });
    }

    const discount = discountAmount || 0;

    // Intra-state sale assumed (walk-in retail): GST splits evenly into CGST + SGST by
    // default. The pharmacist can override the split (as a %) from the billing screen —
    // in that case the client sends the already-computed CGST/SGST amounts directly.
    const hasCustomSplit = typeof cgstAmount === 'number' && typeof sgstAmount === 'number';
    const finalCgstAmount = hasCustomSplit ? Math.max(0, cgstAmount) : totalGST / 2;
    const finalSgstAmount = hasCustomSplit ? Math.max(0, sgstAmount) : totalGST / 2;
    const finalGstAmount = finalCgstAmount + finalSgstAmount;
    const totalAmount = subtotal + finalGstAmount - discount;
    const billNumber = await generateBillNumber(owner!);

    const sale = await Sale.create({
      owner,
      billNumber,
      customer: customer?._id,
      customerName: customer?.name || (customerName?.trim()) || 'Walk-in Customer',
      customerMobile: customer?.mobile || (customerMobile?.trim()) || '',
      customerAddress: customer?.address || (customerAddress?.trim()) || '',
      doctor: doctor?._id,
      doctorName: doctor?.name || doctorName?.trim() || '',
      items: enrichedItems,
      subtotal,
      gstAmount: finalGstAmount,
      cgstAmount: finalCgstAmount,
      sgstAmount: finalSgstAmount,
      discountAmount: discount,
      totalAmount,
      paymentMode: paymentMode || 'cash',
      notes: notes || '',
    });

    // Deduct stock for each item
    for (const item of items) {
      const medicine = await Medicine.findOne({ _id: item.medicineId, owner });
      if (medicine) {
        const previousStock = medicine.currentStock;
        medicine.currentStock -= item.quantity;
        await medicine.save();

        await StockTransaction.create({
          owner,
          medicine: medicine._id,
          medicineName: medicine.name,
          transactionType: 'sale',
          quantity: -item.quantity,
          previousStock,
          newStock: medicine.currentStock,
          reference: sale.billNumber,
          referenceId: sale._id,
          notes: `Sale: ${sale.billNumber}`,
        });
      }
    }

    // Update customer purchase total
    if (customer) {
      customer.totalPurchases += totalAmount;
      await customer.save();
    }

    res.status(201).json({ success: true, message: 'Sale created.', data: sale });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create sale.' });
  }
};

export const getSales = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query as Record<string, string>);
    const { startDate, endDate, paymentMode, search } = req.query;

    const filter: Record<string, unknown> = { owner: req.userId };
    if (paymentMode) filter.paymentMode = paymentMode;
    if (search) {
      const regex = new RegExp(search as string, 'i');
      filter.$or = [{ billNumber: regex }, { customerName: regex }, { customerMobile: regex }];
    }
    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter.$gte = new Date(startDate as string);
      if (endDate) dateFilter.$lte = new Date(endDate as string);
      filter.saleDate = dateFilter;
    }

    const [sales, total] = await Promise.all([
      Sale.find(filter).sort({ saleDate: -1 }).skip(skip).limit(limit),
      Sale.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: sales,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch sales.' });
  }
};

export const getSaleById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, owner: req.userId }).populate('customer');
    if (!sale) {
      res.status(404).json({ success: false, message: 'Sale not found.' });
      return;
    }
    res.json({ success: true, data: sale });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch sale.' });
  }
};
