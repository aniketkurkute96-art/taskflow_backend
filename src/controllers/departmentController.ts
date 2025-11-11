import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../database';

export const getDepartments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            users: true,
            tasks: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(departments);
  } catch (error: any) {
    console.error('Get departments error:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
};

export const createDepartment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, parentId } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const department = await prisma.department.create({
      data: {
        name,
        parentId,
      },
      include: {
        parent: true,
      },
    });

    res.status(201).json(department);
  } catch (error: any) {
    console.error('Create department error:', error);
    res.status(500).json({ error: 'Failed to create department' });
  }
};
