import mongoose, { Schema } from 'mongoose';
import { ISupplier } from '../types';

const SupplierSchema = new Schema<ISupplier>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true, default: '' },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    address: { type: String, trim: true, default: '' },
    gstNumber: { type: String, trim: true, default: '' },
    outstandingBalance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

SupplierSchema.index({ name: 'text' });
SupplierSchema.index({ owner: 1 });

export default mongoose.model<ISupplier>('Supplier', SupplierSchema);
