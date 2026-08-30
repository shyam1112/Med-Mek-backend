import { Router } from 'express';
import { getExpiryAlerts, getExpirySummary } from '../controllers/expiryController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/alerts', getExpiryAlerts);
router.get('/summary', getExpirySummary);

export default router;
