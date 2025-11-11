import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../database';

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    // My Tasks
    const myTasks = await prisma.task.findMany({
      where: {
        OR: [{ creatorId: userId }, { assigneeId: userId }],
      },
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
      take: 10,
    });

    // Approval Bucket Count
    const approvalBucketCount = await prisma.taskApprover.count({
      where: {
        approverUserId: userId,
        status: 'pending',
      },
    });

    // Overdue Tasks (tasks created more than 7 days ago and still open/in_progress)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const overdueTasks = await prisma.task.findMany({
      where: {
        OR: [{ creatorId: userId }, { assigneeId: userId }],
        status: { in: ['open', 'in_progress', 'pending_approval'] },
        createdAt: { lt: sevenDaysAgo },
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        department: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Task counts by status
    const taskCounts = {
      open: await prisma.task.count({
        where: {
          OR: [{ creatorId: userId }, { assigneeId: userId }],
          status: 'open',
        },
      }),
      in_progress: await prisma.task.count({
        where: {
          OR: [{ creatorId: userId }, { assigneeId: userId }],
          status: 'in_progress',
        },
      }),
      pending_approval: await prisma.task.count({
        where: {
          OR: [{ creatorId: userId }, { assigneeId: userId }],
          status: 'pending_approval',
        },
      }),
      approved: await prisma.task.count({
        where: {
          OR: [{ creatorId: userId }, { assigneeId: userId }],
          status: 'approved',
        },
      }),
      completed: await prisma.task.count({
        where: {
          OR: [{ creatorId: userId }, { assigneeId: userId }],
          status: 'completed',
        },
      }),
    };

    res.json({
      myTasks,
      approvalBucketCount,
      overdueTasks,
      taskCounts,
    });
  } catch (error: any) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};
