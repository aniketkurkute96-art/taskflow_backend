import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createTask,
  getTasks,
  getTaskById,
  forwardTask,
  completeTask,
  approveTask,
  rejectTask,
  updateTask,
  updateTaskStatus,
  getApprovalBucket,
  addComment,
  getTaskComments,
  getWaitingOnTasks,
} from '../controllers/taskController';
import { getTaskActivityLogs, getTaskTimeline } from '../controllers/activityLogController';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/approval/bucket', getApprovalBucket);
router.get('/waiting-on', getWaitingOnTasks);
router.get('/', getTasks);
router.get('/:id', getTaskById);
router.get('/:taskId/activity', getTaskActivityLogs);
router.get('/:taskId/timeline', getTaskTimeline);
router.get('/:taskId/comments', getTaskComments);
router.post('/', createTask);
router.patch('/:id', updateTask);
router.patch('/:id/status', updateTaskStatus);
router.post('/:id/forward', forwardTask);
router.post('/:id/complete', completeTask);
router.post('/:id/approve', approveTask);
router.post('/:id/reject', rejectTask);
router.post('/:id/comments', addComment);

export default router;
