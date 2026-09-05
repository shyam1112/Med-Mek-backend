import { Response } from 'express';
import mongoose from 'mongoose';
import Sale from '../models/Sale';
import Medicine from '../models/Medicine';
import Customer from '../models/Customer';
import Doctor from '../models/Doctor';
import StockTransaction from '../models/StockTransaction';
import { AuthRequest } from '../types';
import { getPaginationParams, generateBillNumber } from '../utils/helpers';

export const createSale = async (req: AuthRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  try {
    const {
      customerId, customerName, customerMobile, customerAddress, doctorId, doctorName,
      items, paymentMode, notes, discountAmount, cgstAmount, sgstAmount,
    } = req.body;
    const owner = req.userId;

    let responseSale: InstanceType<typeof Sale> | null = null;

    await session.withTransaction(async () => {
      // A picked doctor is denormalized onto the sale (same pattern as
      // medicineName on sale items) so the bill still displays correctly even
      // if the doctor record is later edited or deactivated. Free-typed text
      // with no matching doctor record is still accepted as plain doctorName.
      const doctor = doctorId ? await Doctor.findOne({ _id: doctorId, owner }).session(session) : null;

      let customer = null;
      const realName = customerName?.trim();
      const realMobile = customerMobile?.trim();
      const realAddress = customerAddress?.trim();
      const isWalkin = !realName || realName === 'Walk-in Customer';

      if (customerId) {
        customer = await Customer.findOne({ _id: customerId, owner }).session(session);
      } else if (!isWalkin) {
        // If mobile provided, try to find existing customer by mobile first (avoids duplicates)
        if (realMobile) {
          customer = await Customer.findOne({ mobile: realMobile, owner }).session(session);
        }
        // Still no customer found — create one, capturing the address entered on
        // this bill so it isn't lost (previously discarded after only being used
        // for the printed invoice).
        if (!customer) {
          [customer] = await Customer.create(
            [{ owner, name: realName, mobile: realMobile || '', address: realAddress || '', totalPurchases: 0 }],
            { session }
          );
        }
      }

      // Backfill a missing address on an existing customer record from this bill,
      // rather than silently discarding it.
      if (customer && !customer.address && realAddress) {
        customer.address = realAddress;
        await customer.save({ session });
      }

      let subtotal = 0;
      let totalGST = 0;
      const enrichedItems = [];
      const stockEvents: {
        medicineId: unknown; medicineName: string; quantity: number; previousStock: number; newStock: number;
      }[] = [];

      for (const item of items) {
        const quantity = Number(item.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw Object.assign(new Error('Each item must have a quantity greater than 0.'), { statusCode: 400 });
        }

        // Atomic check-and-decrement in a single write, guarded by the session's
        // transaction — closes the race where two concurrent sales (e.g. two
        // billing terminals) both read stock before either decrements it and
        // both succeed, overselling beyond what's actually on the shelf.
        const updated = await Medicine.findOneAndUpdate(
          { _id: item.medicineId, owner, currentStock: { $gte: quantity } },
          { $inc: { currentStock: -quantity } },
          { new: true, session }
        );

        if (!updated) {
          const existing = await Medicine.findOne({ _id: item.medicineId, owner }).session(session);
          if (!existing) {
            throw Object.assign(new Error(`Medicine ${item.medicineId} not found.`), { statusCode: 404 });
          }
          throw Object.assign(
            new Error(`Insufficient stock for ${existing.name}. Available: ${existing.currentStock}`),
            { statusCode: 400 }
          );
        }

        stockEvents.push({
          medicineId: updated._id,
          medicineName: updated.name,
          quantity,
          previousStock: updated.currentStock + quantity,
          newStock: updated.currentStock,
        });

        // Billing always sells by individual unit (tablet/ml/piece...), never
        // by whole pack — unitsPerPack (default 1) converts the pack price
        // entered on the medicine into what's actually charged per unit.
        // `quantity` here (and the stock $inc above) is therefore already in
        // units, not packs — for unitsPerPack===1 medicines the two are
        // identical, so this is a no-op for every medicine that hasn't set it.
        const unitsPerPack = updated.unitsPerPack || 1;
        const unitPrice = updated.sellingPrice / unitsPerPack;
        const itemSubtotal = quantity * unitPrice;
        const itemGST = (itemSubtotal * updated.gstPercentage) / 100;
        // Clamp so a stale/manipulated/buggy discount value can never push this
        // line (or, via subtotal below, the whole bill) into a negative total.
        const itemDiscount = Math.min(Math.max(Number(item.discount) || 0, 0), itemSubtotal + itemGST);
        const itemTotal = itemSubtotal + itemGST - itemDiscount;

        subtotal += itemSubtotal;
        totalGST += itemGST;

        enrichedItems.push({
          medicine: updated._id,
          medicineName: updated.name,
          manufacturer: updated.manufacturer,
          packSize: updated.packSize,
          batchNumber: updated.batchNumber,
          expiryDate: updated.expiryDate,
          quantity,
          // Stored per-unit (what was actually charged), not the medicine's
          // pack price — so a historical invoice stays accurate even if the
          // medicine's pack price or unitsPerPack changes later.
          sellingPrice: unitPrice,
          gstPercentage: updated.gstPercentage,
          discount: itemDiscount,
          totalAmount: itemTotal,
        });
      }

      // Intra-state sale assumed (walk-in retail): GST splits evenly into CGST + SGST by
      // default. The pharmacist can override the split (as a %) from the billing screen —
      // in that case the client sends the already-computed CGST/SGST amounts directly.
      const hasCustomSplit = typeof cgstAmount === 'number' && typeof sgstAmount === 'number';
      const finalCgstAmount = hasCustomSplit ? Math.max(0, cgstAmount) : totalGST / 2;
      const finalSgstAmount = hasCustomSplit ? Math.max(0, sgstAmount) : totalGST / 2;
      const finalGstAmount = finalCgstAmount + finalSgstAmount;
      const discount = Math.min(Math.max(Number(discountAmount) || 0, 0), subtotal + finalGstAmount);
      const totalAmount = subtotal + finalGstAmount - discount;
      const billNumber = await generateBillNumber(owner!);

      const [sale] = await Sale.create(
        [{
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
        }],
        { session }
      );

      for (const evt of stockEvents) {
        await StockTransaction.create(
          [{
            owner,
            medicine: evt.medicineId,
            medicineName: evt.medicineName,
            transactionType: 'sale',
            quantity: -evt.quantity,
            previousStock: evt.previousStock,
            newStock: evt.newStock,
            reference: sale.billNumber,
            referenceId: sale._id,
            notes: `Sale: ${sale.billNumber}`,
          }],
          { session }
        );
      }

      // Update customer purchase total
      if (customer) {
        customer.totalPurchases += totalAmount;
        await customer.save({ session });
      }

      responseSale = sale;
    });

    res.status(201).json({ success: true, message: 'Sale created.', data: responseSale });
  } catch (err) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    if (statusCode) {
      res.status(statusCode).json({ success: false, message: (err as Error).message });
      return;
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create sale.' });
  } finally {
    session.endSession();
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
