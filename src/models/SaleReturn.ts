import mongoose, { Schema } from 'mongoose';
import { ISaleReturn } from '../types';

const SaleReturnItemSchema = new Schema(
  {
    medicine: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
    medicineName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    sellingPrice: { type: Number, required: true, min: 0 },
    gstPercentage: { type: Number, default: 0 },
    refundAmount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const SaleReturnSchema = new Schema<ISaleReturn>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sale: { type: Schema.Types.ObjectId, ref: 'Sale', required: true },
    billNumber: { type: String, required: true },
    items: [SaleReturnItemSchema],
    totalRefund: { type: Number, required: true, min: 0 },
    reason: { type: String, default: '' },
  },
  { timestamps: true }
);

SaleReturnSchema.index({ owner: 1, sale: 1 });
SaleReturnSchema.index({ owner: 1, createdAt: -1 });

export default mongoose.model<ISaleReturn>('SaleReturn', SaleReturnSchema);
