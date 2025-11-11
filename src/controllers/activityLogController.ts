import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../database';

export const getTaskActivityLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;

    const activityLogs = await prisma.activityLog.findMany({
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

    res.json(activityLogs);
  } catch (error: any) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
};

// Helper function to create activity log
export const createActivityLog = async (
  taskId: string,
  userId: string | null,
  action: string,
  description: string,
  oldValue?: string,
  newValue?: string
): Promise<void> => {
  try {
    await prisma.activityLog.create({
      data: {
        taskId,
        userId,
        action,
        description,
        oldValue: oldValue || null,
        newValue: newValue || null,
      },
    });
  } catch (error) {
    console.error('Error creating activity log:', error);
  }
};

