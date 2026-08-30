import { Router } from 'express';
import {
  getDailySalesReport,
  getMonthlySalesReport,
  getProfitReport,
  getPurchaseReport,
  getInventoryReport,
  getExpiryLossReport,
  getDoctorWiseSalesReport,
  getHsnSummaryReport,
} from '../controllers/reportController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/daily-sales', getDailySalesReport);
router.get('/monthly-sales', getMonthlySalesReport);
router.get('/profit', getProfitReport);
router.get('/purchase', getPurchaseReport);
router.get('/inventory', getInventoryReport);
router.get('/expiry-loss', getExpiryLossReport);
router.get('/doctor-wise', getDoctorWiseSalesReport);
router.get('/hsn-summary', getHsnSummaryReport);

export default router;
