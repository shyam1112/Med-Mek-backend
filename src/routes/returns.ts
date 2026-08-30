import { Router } from 'express';
import { createReturn, getReturnsForSale } from '../controllers/returnController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', createReturn);
router.get('/', getReturnsForSale);

export default router;
