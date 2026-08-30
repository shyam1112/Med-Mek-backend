import mongoose, { Schema } from 'mongoose';
import { ICustomer } from '../types';

const CustomerSchema = new Schema<ICustomer>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    totalPurchases: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CustomerSchema.index({ name: 'text', mobile: 'text' });
CustomerSchema.index({ owner: 1, mobile: 1 });

export default mongoose.model<ICustomer>('Customer', CustomerSchema);
