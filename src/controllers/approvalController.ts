import { AppDataSource } from '../database';
import { Task } from '../models/Task';
import { TaskApprover } from '../models/TaskApprover';
import { ApprovalTemplate } from '../models/ApprovalTemplate';
import { AuthRequest } from '../middleware/auth';
import { Response } from 'express';
import { TaskStatus, ApprovalType } from '../types/enums';
import { ApproverStatus } from '../types/approval';

const taskRepository = AppDataSource.getRepository(Task);
const taskApproverRepository = AppDataSource.getRepository(TaskApprover);
const approvalTemplateRepository = AppDataSource.getRepository(ApprovalTemplate);

// Get approval bucket for current user
export const getApprovalBucket = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    
    // Get tasks where user is an approver and status is pending
    const pendingApprovals = await taskApproverRepository.find({
      where: { 
        approverUserId: user.id,
        status: ApproverStatus.PENDING
      },
      relations: ['task', 'task.creator', 'task.assignee', 'task.department']
    });

    // Get tasks that are in approval status and user is potential approver
    const tasksInApproval = await taskRepository.find({
      where: { 
        status: TaskStatus.APPROVAL_PENDING,
        approvalType: ApprovalType.BACKWARD_360
      },
      relations: ['creator', 'assignee', 'department', 'approvers']
    });

    // Filter tasks where user might be involved in approval workflow
    const relevantTasks = tasksInApproval.filter(task => {
      // Check if user is already an approver
      const isApprover = task.approvers.some(approver => approver.approverUserId === user.id);
      
      // For 360 approval, check if user is in the same department or has relevant role
      if (task.approvalType === ApprovalType.BACKWARD_360) {
        return task.creatorId === user.id || 
               task.assigneeId === user.id || 
               isApprover ||
               (task.departmentId && task.departmentId === user.departmentId) ||
               user.role === 'admin';
      }
      
      return isApprover;
    });

    res.json({
      pendingApprovals: pendingApprovals.map(pa => pa.task),
      relevantTasks
    });
  } catch (error) {
    console.error('Get approval bucket error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get task approvers
export const getTaskApprovers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const user = req.user!;
    
    const task = await taskRepository.findOne({
      where: { id: taskId },
      relations: ['creator', 'assignee', 'department']
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Check if user has access to this task
    if (task.creatorId !== user.id && task.assigneeId !== user.id && user.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const approvers = await taskApproverRepository.find({
      where: { taskId },
      relations: ['approverUser'],
      order: { levelOrder: 'ASC' }
    });

    res.json({ approvers });
  } catch (error) {
    console.error('Get task approvers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Approve or reject task
export const approveTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const user = req.user!;
    const { action, comment } = req.body; // action: 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      res.status(400).json({ error: 'Invalid action. Must be "approve" or "reject"' });
      return;
    }

    const task = await taskRepository.findOne({
      where: { id: taskId },
      relations: ['creator', 'assignee', 'department', 'approvers']
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Find the approver record for this user
    const approver = await taskApproverRepository.findOne({
      where: { taskId, approverUserId: user.id, status: ApproverStatus.PENDING }
    });

    if (!approver) {
      res.status(403).json({ error: 'You are not authorized to approve this task' });
      return;
    }

    // Update approver status
    approver.status = action === 'approve' ? ApproverStatus.APPROVED : ApproverStatus.REJECTED;
    approver.comments = comment || '';
    approver.actionAt = new Date();
    await taskApproverRepository.save(approver);

    // Check if all approvers have responded
    const allApprovers = await taskApproverRepository.find({ where: { taskId } });
    const allResponded = allApprovers.every(a => a.status !== ApproverStatus.PENDING);
    
    if (allResponded) {
      const allApproved = allApprovers.every(a => a.status === ApproverStatus.APPROVED);
      
      if (allApproved) {
        task.status = TaskStatus.APPROVED;
      } else {
        task.status = TaskStatus.REJECTED;
      }
      
      await taskRepository.save(task);
    }

    res.json({
      message: `Task ${action}d successfully`,
      approver,
      task: {
        id: task.id,
        status: task.status
      }
    });
  } catch (error) {
    console.error('Approve task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Submit task for approval
export const submitForApproval = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const user = req.user!;

    const task = await taskRepository.findOne({
      where: { id: taskId },
      relations: ['creator', 'assignee', 'department', 'approvalTemplate']
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Check if user can submit this task
    if (task.creatorId !== user.id && user.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Task must be in DRAFT status
    if (task.status !== TaskStatus.DRAFT) {
      res.status(400).json({ error: 'Task is not in draft status' });
      return;
    }

    // Find appropriate approval template
    let template = null;
    if (task.approvalTemplateId) {
      template = await approvalTemplateRepository.findOne({
        where: { id: task.approvalTemplateId, isActive: true },
        relations: ['stages']
      });
    } else {
      // Auto-select template based on task criteria
      const templates = await approvalTemplateRepository.find({
        where: { isActive: true },
        relations: ['stages']
      });

      template = templates.find(t => t.matchesCondition(task.departmentId ?? '', task.amount ?? undefined));
    }

    if (!template || template.stages.length === 0) {
      res.status(400).json({ error: 'No approval template found for this task' });
      return;
    }

    // Create approver records based on template stages
    const approvers: TaskApprover[] = [];
    
    for (const stage of template.stages) {
      const approverUserId = stage.getApproverUserId({
        creatorId: task.creatorId,
        assigneeId: task.assigneeId ?? undefined,
        departmentId: task.departmentId ?? undefined,
        hodId: undefined, // Would need to fetch from service
        cfoId: undefined   // Would need to fetch from service
      });
      
      if (approverUserId) {
        const approver = taskApproverRepository.create({
          taskId: task.id,
          approverUserId: approverUserId,
          levelOrder: stage.levelOrder,
          status: ApproverStatus.PENDING
        });
        approvers.push(approver);
      }
    }

    if (approvers.length === 0) {
      res.status(400).json({ error: 'No approvers found for this task' });
      return;
    }

    // Save approvers
    await taskApproverRepository.save(approvers);

    // Update task status
    task.status = TaskStatus.APPROVAL_PENDING;
    task.approvalTemplateId = template.id;
    await taskRepository.save(task);

    res.json({
      message: 'Task submitted for approval successfully',
      task: {
        id: task.id,
        status: task.status,
        approvers: approvers.length
      }
    });
  } catch (error) {
    console.error('Submit for approval error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};