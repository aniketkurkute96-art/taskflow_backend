import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '../controllers/approvalTemplateController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// All routes require admin role
router.use(requireRole('admin'));

router.get('/', getTemplates);
router.get('/:id', getTemplateById);
router.post('/', createTemplate);
router.put('/:id', updateTemplate);
router.delete('/:id', deleteTemplate);

export default router;
