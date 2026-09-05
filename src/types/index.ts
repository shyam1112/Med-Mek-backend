import { Request } from 'express';
import { Document, Types } from 'mongoose';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  storeName: string;
  storeAddress: string;
  storeGST: string;
  storeDLNo: string;
  storeUpiId: string;
  defaultDiscountPercent: number;
  status: 'pending' | 'approved' | 'rejected';
  role: 'user' | 'superadmin';
  rejectionReason: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  seenAlerts: {
    expiredIds: string[];
    expiringIds: string[];
    lowStockIds: string[];
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

export interface IMedicine extends Document {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  name: string;
  genericName: string;
  category: string;
  manufacturer: string;
  dosageForm: string;
  strength: string;
  packSize: string;
  batchNumber: string;
  expiryDate?: Date;
  purchasePrice: number;
  sellingPrice: number;
  gstPercentage: number;
  hsnCode: string;
  scheduleClass: 'None' | 'H' | 'H1' | 'X';
  unitOfMeasure: 'Strip' | 'Bottle' | 'Box' | 'Tube' | 'Vial' | 'Piece';
  unitsPerPack: number;
  storageCondition: string;
  location: string;
  currentStock: number;
  minimumStockLevel: number;
  barcode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISupplier extends Document {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstNumber: string;
  outstandingBalance: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICustomer extends Document {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  name: string;
  mobile: string;
  address: string;
  totalPurchases: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDoctor extends Document {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  name: string;
  qualification: string;
  specialization: string;
  clinicName: string;
  phone: string;
  registrationNo: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPurchaseItem {
  medicine: Types.ObjectId;
  medicineName: string;
  batchNumber: string;
  expiryDate: Date;
  quantity: number;
  purchasePrice: number;
  gstPercentage: number;
  totalAmount: number;
}

export interface IPurchase extends Document {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  invoiceNumber: string;
  supplier: Types.ObjectId;
  supplierName: string;
  purchaseDate: Date;
  items: IPurchaseItem[];
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid';
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISaleItem {
  medicine: Types.ObjectId;
  medicineName: string;
  manufacturer: string;
  packSize: string;
  batchNumber: string;
  expiryDate?: Date;
  quantity: number;
  sellingPrice: number;
  gstPercentage: number;
  discount: number;
  totalAmount: number;
}

export interface ISale extends Document {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  billNumber: string;
  customer?: Types.ObjectId;
  customerName: string;
  customerMobile: string;
  customerAddress: string;
  doctor?: Types.ObjectId;
  doctorName: string;
  saleDate: Date;
  items: ISaleItem[];
  subtotal: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  discountAmount: number;
  totalAmount: number;
  totalReturned: number;
  paymentMode: 'cash' | 'card' | 'upi' | 'credit';
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISaleReturnItem {
  medicine: Types.ObjectId;
  medicineName: string;
  quantity: number;
  sellingPrice: number;
  gstPercentage: number;
  refundAmount: number;
}

export interface ISaleReturn extends Document {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  sale: Types.ObjectId;
  billNumber: string;
  items: ISaleReturnItem[];
  totalRefund: number;
  reason: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStockTransaction extends Document {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  medicine: Types.ObjectId;
  medicineName: string;
  transactionType: 'stock_in' | 'stock_out' | 'adjustment' | 'sale' | 'purchase' | 'return';
  quantity: number;
  previousStock: number;
  newStock: number;
  reference?: string;
  referenceId?: Types.ObjectId;
  notes: string;
  createdAt: Date;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
