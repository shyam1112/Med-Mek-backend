import { Router } from 'express';
import {
  getMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  getMedicineStockHistory,
  searchMedicines,
  getCategories,
} from '../controllers/medicineController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/search', searchMedicines);
router.get('/categories', getCategories);
router.get('/', getMedicines);
router.post('/', createMedicine);
router.get('/:id', getMedicineById);
router.put('/:id', updateMedicine);
router.delete('/:id', deleteMedicine);
router.get('/:id/stock-history', getMedicineStockHistory);

export default router;
