import { Router } from 'express';
import {
  getDoctors,
  searchDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
} from '../controllers/doctorController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/search', searchDoctors);
router.get('/', getDoctors);
router.post('/', createDoctor);
router.get('/:id', getDoctorById);
router.put('/:id', updateDoctor);
router.delete('/:id', deleteDoctor);

export default router;
