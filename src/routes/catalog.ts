import { Router } from 'express';
import { searchCatalog, getCatalogItem } from '../controllers/catalogController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/search', searchCatalog);
router.get('/:id', getCatalogItem);

export default router;
