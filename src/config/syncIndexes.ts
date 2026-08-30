import User from '../models/User';
import Medicine from '../models/Medicine';
import Supplier from '../models/Supplier';
import Customer from '../models/Customer';
import Doctor from '../models/Doctor';
import Purchase from '../models/Purchase';
import Sale from '../models/Sale';
import SaleReturn from '../models/SaleReturn';
import StockTransaction from '../models/StockTransaction';

export const syncModelIndexes = async (): Promise<void> => {
  await Promise.all([
    User.syncIndexes(),
    Medicine.syncIndexes(),
    Supplier.syncIndexes(),
    Customer.syncIndexes(),
    Doctor.syncIndexes(),
    Purchase.syncIndexes(),
    Sale.syncIndexes(),
    SaleReturn.syncIndexes(),
    StockTransaction.syncIndexes(),
  ]);
};
