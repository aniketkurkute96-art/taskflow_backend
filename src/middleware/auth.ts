import { Request, Response, NextFunction } from 'express';

// Simple authentication - token is just user ID

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

// HARDCODED USERS - Same as in authController
const USERS = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'password',
    role: 'admin',
    departmentId: '1',
    active: true,
  },
  {
    id: '2',
    name: 'John Creator',
    email: 'creator@example.com',
    password: 'password',
    role: 'creator',
    departmentId: '1',
    active: true,
  },
  {
    id: '3',
    name: 'Jane Assignee',
    email: 'assignee@example.com',
    password: 'password',
    role: 'assignee',
    departmentId: '1',
    active: true,
  },
  {
    id: '4',
    name: 'Bob HOD',
    email: 'hod@example.com',
    password: 'password',
    role: 'hod',
    departmentId: '1',
    active: true,
  },
  {
    id: '5',
    name: 'Alice CFO',
    email: 'cfo@example.com',
    password: 'password',
    role: 'cfo',
    departmentId: '2',
    active: true,
  },
];

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    // Token is just the user ID
    const userId = authHeader.substring(7);

    // Find user in hardcoded array
    const user = USERS.find(u => u.id === userId);

    if (!user || !user.active) {
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};
