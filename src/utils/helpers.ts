import { Types, Error as MongooseError } from 'mongoose';
import Sale from '../models/Sale';
import Purchase from '../models/Purchase';

// A required field left blank (or the wrong type) throws a Mongoose
// ValidationError, not a generic server fault — surface the real reason
// instead of a bare 500 the user can't act on.
export const getValidationMessage = (error: unknown): string | null => {
  if (error instanceof MongooseError.ValidationError) {
    return Object.values(error.errors).map((e) => e.message).join(' ');
  }
  return null;
};

export const generateBillNumber = async (owner: Types.ObjectId | string): Promise<string> => {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const prefix = `BILL-${year}${month}${day}`;

  const lastSale = await Sale.findOne(
    { owner, billNumber: new RegExp(`^${prefix}`) },
    {},
    { sort: { billNumber: -1 } }
  );

  let seq = 1;
  if (lastSale) {
    const lastSeq = parseInt(lastSale.billNumber.split('-').pop() || '0', 10);
    seq = lastSeq + 1;
  }

  return `${prefix}-${String(seq).padStart(4, '0')}`;
};

export const generateInvoiceNumber = async (owner: Types.ObjectId | string): Promise<string> => {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const prefix = `PO-${year}${month}`;

  const lastPurchase = await Purchase.findOne(
    { owner, invoiceNumber: new RegExp(`^${prefix}`) },
    {},
    { sort: { invoiceNumber: -1 } }
  );

  let seq = 1;
  if (lastPurchase) {
    const lastSeq = parseInt(lastPurchase.invoiceNumber.split('-').pop() || '0', 10);
    seq = lastSeq + 1;
  }

  return `${prefix}-${String(seq).padStart(4, '0')}`;
};

export const parseReportDateRange = (startDate?: string, endDate?: string): { start: Date; end: Date } => {
  const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
  start.setHours(0, 0, 0, 0);
  const end = endDate ? new Date(endDate) : new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

export const getPaginationParams = (query: { page?: string; limit?: string }) => {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

export const getDateRange = (period: string): { start: Date; end: Date } => {
  const now = new Date();
  const start = new Date();
  const end = new Date();

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
  }

  return { start, end };
};
