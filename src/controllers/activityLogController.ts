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
  oldValue?: string | null,
  newValue?: string | null
): Promise<void> => {
  console.log('[createActivityLog] Called with:', { taskId, userId, action, description, oldValue, newValue });
  try {
    const log = await prisma.activityLog.create({
      data: {
        taskId,
        userId,
        action,
        description,
        oldValue: oldValue || null,
        newValue: newValue || null,
      },
    });
    console.log('[createActivityLog] Success! Log ID:', log.id);
  } catch (error) {
    console.error('[createActivityLog] Error creating activity log:', error);
    throw error; // Re-throw so caller knows it failed
  }
};

