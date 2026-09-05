import mongoose, { Schema } from 'mongoose';
import { IMedicine } from '../types';

const MedicineSchema = new Schema<IMedicine>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    genericName: { type: String, trim: true, default: '' },
    category: { type: String, required: true, trim: true },
    manufacturer: { type: String, trim: true, default: '' },
    dosageForm: { type: String, trim: true, default: '' },
    strength: { type: String, trim: true, default: '' },
    packSize: { type: String, trim: true, default: '' },
    batchNumber: { type: String, trim: true, default: '' },
    expiryDate: { type: Date, required: false },
    purchasePrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    gstPercentage: { type: Number, default: 0, enum: [0, 5, 12, 18, 28] },
    hsnCode: { type: String, trim: true, default: '' },
    scheduleClass: { type: String, enum: ['None', 'H', 'H1', 'X'], default: 'None' },
    unitOfMeasure: { type: String, enum: ['Strip', 'Bottle', 'Box', 'Tube', 'Vial', 'Piece'], default: 'Strip' },
    // How many individually-sellable units (tablets, ml, pieces...) are in
    // one pack of purchasePrice/sellingPrice. Defaults to 1 so every existing
    // medicine (and any pharmacy that never touches this) keeps billing by
    // whole pack exactly as before — only a medicine where this is explicitly
    // set above 1 switches to per-unit billing (see billingController.createSale).
    unitsPerPack: { type: Number, default: 1, min: 1 },
    storageCondition: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    currentStock: { type: Number, required: true, min: 0, default: 0 },
    minimumStockLevel: { type: Number, default: 10, min: 0 },
    barcode: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

MedicineSchema.index({ name: 'text', genericName: 'text', barcode: 'text' });
MedicineSchema.index({ owner: 1, expiryDate: 1 });
MedicineSchema.index({ owner: 1, currentStock: 1 });
MedicineSchema.index(
  { owner: 1, barcode: 1 },
  { unique: true, partialFilterExpression: { barcode: { $gt: '' } } }
);

export default mongoose.model<IMedicine>('Medicine', MedicineSchema);
