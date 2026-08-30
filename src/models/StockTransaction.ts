import mongoose, { Schema } from 'mongoose';
import { IStockTransaction } from '../types';

const StockTransactionSchema = new Schema<IStockTransaction>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    medicine: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
    medicineName: { type: String, required: true },
    transactionType: {
      type: String,
      enum: ['stock_in', 'stock_out', 'adjustment', 'sale', 'purchase', 'return'],
      required: true,
    },
    quantity: { type: Number, required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    reference: { type: String },
    referenceId: { type: Schema.Types.ObjectId },
    notes: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

StockTransactionSchema.index({ owner: 1, medicine: 1, createdAt: -1 });
StockTransactionSchema.index({ owner: 1, transactionType: 1 });
StockTransactionSchema.index({ owner: 1, createdAt: -1 });

export default mongoose.model<IStockTransaction>('StockTransaction', StockTransactionSchema);
