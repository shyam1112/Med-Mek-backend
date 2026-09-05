import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from '../types';

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String, required: true, unique: true,
      trim: true, lowercase: true,
      match: [/^[a-z0-9_]{3,30}$/, 'Username must be 3–30 characters (letters, numbers, underscore only)'],
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    phone: { type: String, default: '' },
    storeName: { type: String, default: '' },
    storeAddress: { type: String, default: '' },
    storeGST: { type: String, default: '' },
    storeDLNo: { type: String, default: '' },
    storeUpiId: { type: String, default: '' },
    // Auto-applied as the bill-level "Extra Discount" (as a %) on every new
    // bill in Billing — still fully editable/removable per bill. 0 means no
    // auto-discount, same as today for every existing account.
    defaultDiscountPercent: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    role: {
      type: String,
      enum: ['user', 'superadmin'],
      default: 'user',
    },
    rejectionReason: { type: String, default: '' },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    // Medicine _ids the owner has already acknowledged in the notification
    // bell, per alert category — a category only re-triggers the badge when
    // it contains an id NOT in this list (a genuinely new problem), not just
    // because time passed or the bell was reopened.
    seenAlerts: {
      expiredIds: { type: [String], default: [] },
      expiringIds: { type: [String], default: [] },
      lowStockIds: { type: [String], default: [] },
    },
  },
  { timestamps: true }
);

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  return obj;
};

export default mongoose.model<IUser>('User', UserSchema);
