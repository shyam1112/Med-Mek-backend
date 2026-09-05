import mongoose, { Schema } from 'mongoose';
import { IDoctor } from '../types';

const DoctorSchema = new Schema<IDoctor>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    qualification: { type: String, trim: true, default: '' },
    specialization: { type: String, trim: true, default: '' },
    clinicName: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    registrationNo: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
    // At most one doctor per owner has this true — enforced in
    // doctorController.setDefaultDoctor, not at the schema level.
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

DoctorSchema.index({ name: 'text', clinicName: 'text' });
DoctorSchema.index({ owner: 1, name: 1 });

export default mongoose.model<IDoctor>('Doctor', DoctorSchema);
