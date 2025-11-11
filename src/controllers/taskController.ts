import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../database';
import {
  processTaskCompletion,
  processApproval,
  processRejection,
} from '../services/approvalEngine';
import { createActivityLog } from './activityLogController';

export const createTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      title,
      description,
      assigneeId,
      assigneeType,
      departmentId,
      amount,
      approvalType,
      approvalTemplateId,
      manualApprovers, // Array of { levelOrder: number, approverUserId: string }
    } = req.body;

    if (!title || !approvalType) {
      res.status(400).json({ error: 'Title and approvalType are required' });
      return;
    }

    if (!['360', 'specific', 'predefined'].includes(approvalType)) {
      res.status(400).json({ error: 'Invalid approvalType. Must be 360, specific, or predefined' });
      return;
    }

    // Create task
    const task = await prisma.task.create({
      data: {
        title,
        description,
        creatorId: req.user!.userId,
        assigneeId,
        assigneeType,
        departmentId,
        amount: amount ? parseFloat(amount) : null,
        approvalType,
        approvalTemplateId: approvalType === 'predefined' ? approvalTemplateId : null,
        status: 'open',
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        department: true,
        approvalTemplate: true,
      },
    });

    // If specific approval type, create manual approvers
    if (approvalType === 'specific' && manualApprovers && Array.isArray(manualApprovers)) {
      for (const approver of manualApprovers) {
        await prisma.taskApprover.create({
          data: {
            taskId: task.id,
            levelOrder: approver.levelOrder,
            approverUserId: approver.approverUserId,
            status: 'pending',
          },
        });
      }
    }

    // Create activity log for task creation
    await createActivityLog(
      task.id,
      req.user!.userId,
      'created',
      `Task created by ${task.creator.name}`,
      null,
      'open'
    );

    // If assigned, log assignment
    if (assigneeId) {
      const assigneeUser = await prisma.user.findUnique({ where: { id: assigneeId } });
      if (assigneeUser) {
        await createActivityLog(
          task.id,
          req.user!.userId,
          'assigned',
          `Task assigned to ${assigneeUser.name}`,
          null,
          assigneeUser.name
        );
      }
    }

    res.status(201).json(task);
  } catch (error: any) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
};

export const getTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, assigneeId, creatorId } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (assigneeId) where.assigneeId = assigneeId;
    if (creatorId) where.creatorId = creatorId;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        department: true,
        _count: {
          select: {
            approvers: { where: { status: 'pending' } },
            comments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(tasks);
  } catch (error: any) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

export const getTaskById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        department: true,
        approvalTemplate: { include: { stages: { orderBy: { levelOrder: 'asc' } } } },
        nodes: {
          include: {
            fromUser: { select: { id: true, name: true, email: true } },
            toUser: { select: { id: true, name: true, email: true } },
          },
          orderBy: { forwardedAt: 'asc' },
        },
        approvers: {
          include: {
            approver: { select: { id: true, name: true, email: true } },
          },
          orderBy: { levelOrder: 'asc' },
        },
        comments: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        attachments: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        checklistItems: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json(task);
  } catch (error: any) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
};

export const forwardTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { toUserId } = req.body;

    if (!toUserId) {
      res.status(400).json({ error: 'toUserId is required' });
      return;
    }

    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Check if user is current assignee or approver
    const isAssignee = task.assigneeId === req.user!.userId;
    const isApprover = await prisma.taskApprover.findFirst({
      where: {
        taskId: id,
        approverUserId: req.user!.userId,
        status: 'pending',
      },
    });

    if (!isAssignee && !isApprover) {
      res.status(403).json({ error: 'Only assignee or current approver can forward task' });
      return;
    }

    // Create forward node
    const node = await prisma.taskNode.create({
      data: {
        taskId: id,
        fromUserId: req.user!.userId,
        toUserId,
      },
      include: {
        fromUser: { select: { id: true, name: true, email: true } },
        toUser: { select: { id: true, name: true, email: true } },
      },
    });

    // Update task assignee
    await prisma.task.update({
      where: { id },
      data: {
        assigneeId: toUserId,
        status: task.status === 'open' ? 'in_progress' : task.status,
      },
    });

    // Create activity log for forward
    await createActivityLog(
      id,
      req.user!.userId,
      'forwarded',
      `Task forwarded from ${node.fromUser.name} to ${node.toUser.name}`,
      node.fromUser.name,
      node.toUser.name
    );

    res.json(node);
  } catch (error: any) {
    console.error('Forward task error:', error);
    res.status(500).json({ error: 'Failed to forward task' });
  }
};

export const completeTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Check if user is assignee
    if (task.assigneeId !== req.user!.userId) {
      res.status(403).json({ error: 'Only assignee can complete task' });
      return;
    }

    const result = await processTaskCompletion(id, req.user!.userId);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    const updatedTask = await prisma.task.findUnique({
      where: { id },
      include: {
        approvers: {
          include: {
            approver: { select: { id: true, name: true, email: true } },
          },
          orderBy: { levelOrder: 'asc' },
        },
      },
    });

    res.json({ task: updatedTask, approvers: result.approvers });
  } catch (error: any) {
    console.error('Complete task error:', error);
    res.status(500).json({ error: 'Failed to complete task' });
  }
};

export const approveTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await processApproval(id, req.user!.userId);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        approvers: {
          include: {
            approver: { select: { id: true, name: true, email: true } },
          },
          orderBy: { levelOrder: 'asc' },
        },
      },
    });

    res.json({
      task,
      isComplete: result.isComplete,
      message: result.isComplete ? 'Task approved and completed' : 'Approval recorded',
    });
  } catch (error: any) {
    console.error('Approve task error:', error);
    res.status(500).json({ error: 'Failed to approve task' });
  }
};

export const rejectTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { forwardToUserId } = req.body;

    const result = await processRejection(id, req.user!.userId, forwardToUserId);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        nodes: {
          include: {
            fromUser: { select: { id: true, name: true, email: true } },
            toUser: { select: { id: true, name: true, email: true } },
          },
          orderBy: { forwardedAt: 'desc' },
        },
      },
    });

    res.json({
      task,
      message: 'Task rejected and forwarded back',
    });
  } catch (error: any) {
    console.error('Reject task error:', error);
    res.status(500).json({ error: 'Failed to reject task' });
  }
};

export const updateTaskStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ error: 'Status is required' });
      return;
    }

    // Validate status
    const allowedStatuses = ['open', 'in_progress', 'rejected'];
    if (!allowedStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid status. Allowed: open, in_progress, rejected' });
      return;
    }

    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Check if user is assignee
    if (task.assigneeId !== req.user!.userId) {
      res.status(403).json({ error: 'Only assignee can update task status' });
      return;
    }

    // Don't allow status change if task is already completed or in approval
    if (['pending_approval', 'approved'].includes(task.status)) {
      res.status(400).json({ error: 'Cannot change status of task in approval or completed' });
      return;
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: { status },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        department: true,
      },
    });

    // Create activity log for status change
    const statusLabels: Record<string, string> = {
      open: 'Open',
      in_progress: 'In Progress',
      rejected: 'Rejected',
    };
    
    await createActivityLog(
      id,
      req.user!.userId,
      'status_changed',
      `Status changed from ${statusLabels[task.status] || task.status} to ${statusLabels[status] || status}`,
      task.status,
      status
    );

    res.json(updatedTask);
  } catch (error: any) {
    console.error('Update task status error:', error);
    res.status(500).json({ error: 'Failed to update task status' });
  }
};

export const getApprovalBucket = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { all } = req.query;
    
    // Build where clause - if 'all' param is true, fetch all approvals; otherwise just pending
    const whereClause: any = {
      approverUserId: req.user!.userId,
    };
    
    if (!all || all !== 'true') {
      whereClause.status = 'pending';
    }

    const approvals = await prisma.taskApprover.findMany({
      where: whereClause,
      include: {
        task: {
          include: {
            creator: { select: { id: true, name: true, email: true } },
            assignee: { select: { id: true, name: true, email: true } },
            department: true,
            _count: {
              select: {
                approvers: true,
                comments: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(approvals);
  } catch (error: any) {
    console.error('Get approval bucket error:', error);
    res.status(500).json({ error: 'Failed to fetch approval bucket' });
  }
};

export const updateTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      assigneeId,
      departmentId,
      amount,
      startDate,
      dueDate,
    } = req.body;

    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Check if user is admin or assignee
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    const isAdmin = user?.role === 'admin';
    const isAssignee = task.assigneeId === req.user!.userId;

    if (!isAdmin && !isAssignee) {
      res.status(403).json({ error: 'Only admin or assignee can edit task' });
      return;
    }

    // Build update data
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
    if (departmentId !== undefined) updateData.departmentId = departmentId;
    if (amount !== undefined) updateData.amount = amount ? parseFloat(amount) : null;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        department: true,
      },
    });

    res.json(updatedTask);
  } catch (error: any) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
};

export const addComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    const comment = await prisma.comment.create({
      data: {
        taskId: id,
        userId: req.user!.userId,
        content,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Create activity log for comment
    await createActivityLog(
      id,
      req.user!.userId,
      'commented',
      `${comment.user.name} added a comment`,
      null,
      null
    );

    res.status(201).json(comment);
  } catch (error: any) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

export const getTaskComments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;

    const comments = await prisma.comment.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(comments);
  } catch (error: any) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};

// Get tasks user has forwarded (Waiting On)
export const getWaitingOnTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Find all task nodes where user forwarded to someone
    const forwardedNodes = await prisma.taskNode.findMany({
      where: { fromUserId: req.user!.userId },
      include: {
        task: {
          include: {
            creator: { select: { id: true, name: true, email: true } },
            assignee: { select: { id: true, name: true, email: true } },
            department: true,
            _count: {
              select: {
                approvers: { where: { status: 'pending' } },
                comments: true,
              },
            },
          },
        },
        toUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { forwardedAt: 'desc' },
    });

    // Filter to show only tasks that are still with the forwarded user or pending
    const waitingOnTasks = forwardedNodes.filter(
      node => 
        node.task.assigneeId === node.toUserId || 
        ['pending_approval', 'in_progress'].includes(node.task.status)
    );

    res.json(waitingOnTasks);
  } catch (error: any) {
    console.error('Get waiting on tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch waiting on tasks' });
  }
};
