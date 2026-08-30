import { Router } from 'express';
import { stockIn, stockOut, adjustStock, getTransactionHistory } from '../controllers/inventoryController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/stock-in', stockIn);
router.post('/stock-out', stockOut);
router.post('/adjust', adjustStock);
router.get('/transactions', getTransactionHistory);

export default router;
