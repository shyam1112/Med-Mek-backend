import mongoose, { Schema } from 'mongoose';
import { ISale } from '../types';

const SaleItemSchema = new Schema(
  {
    medicine: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
    medicineName: { type: String, required: true },
    manufacturer: { type: String, default: '' },
    packSize: { type: String, default: '' },
    batchNumber: { type: String, default: '' },
    expiryDate: { type: Date },
    quantity: { type: Number, required: true, min: 1 },
    sellingPrice: { type: Number, required: true, min: 0 },
    gstPercentage: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    discountPercent: { type: Number, min: 0, max: 100 },
    totalAmount: { type: Number, required: true },
  },
  { _id: false }
);

const SaleSchema = new Schema<ISale>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    billNumber: { type: String, required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String, default: 'Walk-in Customer' },
    customerMobile: { type: String, default: '' },
    customerAddress: { type: String, default: '' },
    doctor: { type: Schema.Types.ObjectId, ref: 'Doctor' },
    doctorName: { type: String, default: '' },
    saleDate: { type: Date, default: Date.now },
    items: [SaleItemSchema],
    subtotal: { type: Number, required: true },
    gstAmount: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    discountPercent: { type: Number, min: 0, max: 100 },
    totalAmount: { type: Number, required: true },
    totalReturned: { type: Number, default: 0 },
    paymentMode: { type: String, enum: ['cash', 'card', 'upi', 'credit'], default: 'cash' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

SaleSchema.index({ owner: 1, saleDate: -1 });
SaleSchema.index({ owner: 1, customer: 1 });
SaleSchema.index({ owner: 1, billNumber: 1 }, { unique: true });

export default mongoose.model<ISale>('Sale', SaleSchema);
