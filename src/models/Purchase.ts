import mongoose, { Schema } from 'mongoose';
import { IPurchase } from '../types';

const PurchaseItemSchema = new Schema(
  {
    medicine: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
    medicineName: { type: String, required: true },
    batchNumber: { type: String, default: '' },
    expiryDate: { type: Date, required: false },
    quantity: { type: Number, required: true, min: 1 },
    purchasePrice: { type: Number, required: true, min: 0 },
    gstPercentage: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
  },
  { _id: false }
);

const PurchaseSchema = new Schema<IPurchase>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    invoiceNumber: { type: String, required: true },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    supplierName: { type: String, required: true },
    purchaseDate: { type: Date, default: Date.now },
    items: [PurchaseItemSchema],
    subtotal: { type: Number, required: true },
    gstAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['pending', 'partial', 'paid'], default: 'pending' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

PurchaseSchema.index({ owner: 1, purchaseDate: -1 });
PurchaseSchema.index({ owner: 1, supplier: 1 });
PurchaseSchema.index({ owner: 1, paymentStatus: 1 });
PurchaseSchema.index({ owner: 1, invoiceNumber: 1 }, { unique: true });

export default mongoose.model<IPurchase>('Purchase', PurchaseSchema);
