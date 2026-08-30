import { Router } from 'express';
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierPurchaseHistory,
  getSupplierStatement,
} from '../controllers/supplierController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getSuppliers);
router.post('/', createSupplier);
router.get('/:id', getSupplierById);
router.put('/:id', updateSupplier);
router.delete('/:id', deleteSupplier);
router.get('/:id/purchases', getSupplierPurchaseHistory);
router.get('/:id/statement', getSupplierStatement);

export default router;
