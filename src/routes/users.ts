import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/userController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET routes - accessible to all authenticated users
router.get('/', getUsers);
router.get('/:id', getUserById);

// Write routes - admin only
router.post('/', requireRole('admin'), createUser);
router.put('/:id', requireRole('admin'), updateUser);
router.delete('/:id', requireRole('admin'), deleteUser);

export default router;
