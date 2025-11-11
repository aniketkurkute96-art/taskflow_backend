import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getApprovalBucket,
  getTaskApprovers,
  approveTask,
  submitForApproval
} from '../controllers/approvalController';

const router = Router();

// All routes require authentication
router.get('/bucket', authenticate, getApprovalBucket);
router.get('/tasks/:taskId/approvers', authenticate, getTaskApprovers);
router.post('/tasks/:taskId/submit', authenticate, submitForApproval);
router.post('/tasks/:taskId/approve', authenticate, approveTask);

export default router;