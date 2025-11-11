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

// All routes require admin role
router.use(requireRole('admin'));

router.get('/', getUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
