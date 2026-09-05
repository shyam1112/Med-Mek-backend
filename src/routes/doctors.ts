import { Router } from 'express';
import {
  getDoctors,
  searchDoctors,
  getDefaultDoctor,
  setDefaultDoctor,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
} from '../controllers/doctorController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/search', searchDoctors);
// Must come before '/:id' — otherwise Express would match "default" as an id.
router.get('/default', getDefaultDoctor);
router.get('/', getDoctors);
router.post('/', createDoctor);
router.get('/:id', getDoctorById);
router.put('/:id', updateDoctor);
router.put('/:id/set-default', setDefaultDoctor);
router.delete('/:id', deleteDoctor);

export default router;
