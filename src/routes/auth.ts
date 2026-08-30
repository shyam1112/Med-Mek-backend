import { Router } from 'express';
import {
  login,
  register,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  markAlertsSeen,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);
router.put('/seen-alerts', authenticate, markAlertsSeen);

export default router;
