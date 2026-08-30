import { Router } from 'express';
import {
  getPurchases,
  getPurchaseById,
  createPurchase,
  updatePayment,
} from '../controllers/purchaseController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getPurchases);
router.post('/', createPurchase);
router.get('/:id', getPurchaseById);
router.patch('/:id/payment', updatePayment);

export default router;
