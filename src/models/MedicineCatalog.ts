import mongoose, { Schema, Document } from 'mongoose';

export interface IMedicineCatalog extends Document {
  name: string;
  genericName: string;
  category: string;
  manufacturer: string;
  dosageForm: string;
  strength: string;
  gstPercentage: number;
  suggestedMRP: number;
  barcode?: string;
}

const MedicineCatalogSchema = new Schema<IMedicineCatalog>(
  {
    name: { type: String, required: true, trim: true },
    genericName: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    manufacturer: { type: String, trim: true, default: '' },
    dosageForm: { type: String, trim: true, default: 'Tablet' },
    strength: { type: String, trim: true, default: '' },
    gstPercentage: { type: Number, default: 12, enum: [0, 5, 12, 18, 28] },
    suggestedMRP: { type: Number, default: 0 },
    barcode: { type: String, trim: true },
  },
  { timestamps: true }
);

MedicineCatalogSchema.index({ name: 'text', genericName: 'text', manufacturer: 'text', strength: 'text' });
MedicineCatalogSchema.index({ name: 1 });
MedicineCatalogSchema.index({ genericName: 1 });

export default mongoose.model<IMedicineCatalog>('MedicineCatalog', MedicineCatalogSchema);
