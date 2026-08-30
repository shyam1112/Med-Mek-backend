import { Router } from 'express';
import { createSale, getSales, getSaleById } from '../controllers/billingController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getSales);
router.post('/', createSale);
router.get('/:id', getSaleById);

export default router;
