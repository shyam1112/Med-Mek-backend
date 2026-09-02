import { Router } from 'express';
import {
  adminLogin,
  getRequests,
  getRequestStats,
  approveRequest,
  rejectRequest,
  resetToApproved,
  deleteUser,
} from '../controllers/adminController';
import { authenticate, requireSuperAdmin } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiters';

const router = Router();

// Public admin login
router.post('/login', authLimiter, adminLogin);

// All routes below require super admin JWT
router.use(authenticate, requireSuperAdmin);

router.get('/stats', getRequestStats);
router.get('/requests', getRequests);
router.patch('/requests/:id/approve', approveRequest);
router.patch('/requests/:id/reject', rejectRequest);
router.patch('/requests/:id/re-approve', resetToApproved);
router.delete('/requests/:id', deleteUser);

export default router;
