import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getDepartments, createDepartment } from '../controllers/departmentController';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getDepartments);
router.post('/', createDepartment);

export default router;
