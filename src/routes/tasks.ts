import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
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
import {
  getTaskAttachments,
  uploadAttachment,
  deleteAttachment,
} from '../controllers/attachmentController';

const router = Router();

// All routes require authentication
router.use(authenticate);

const uploadsRoot = path.join(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const taskId = req.params.taskId || req.params.id || 'general';
    const taskDir = path.join(uploadsRoot, taskId);
    fs.mkdirSync(taskDir, { recursive: true });
    cb(null, taskDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({ storage });

router.get('/approval/bucket', getApprovalBucket);
router.get('/waiting-on', getWaitingOnTasks);
router.get('/', getTasks);
router.get('/:id', getTaskById);
router.get('/:taskId/activity', getTaskActivityLogs);
router.get('/:taskId/timeline', getTaskTimeline);
router.get('/:taskId/comments', getTaskComments);
router.get('/:taskId/attachments', getTaskAttachments);
router.post('/', createTask);
router.patch('/:id', updateTask);
router.patch('/:id/status', updateTaskStatus);
router.post('/:id/forward', forwardTask);
router.post('/:id/complete', completeTask);
router.post('/:id/approve', approveTask);
router.post('/:id/reject', rejectTask);
router.post('/:id/comments', addComment);
router.post('/:taskId/attachments', upload.single('file'), uploadAttachment);
router.delete('/:taskId/attachments/:attachmentId', deleteAttachment);

export default router;
