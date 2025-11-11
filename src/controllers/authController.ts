import { Request, Response } from 'express';
import prisma from '../database';

// Simple authentication - plain password comparison

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, departmentId } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required' });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    // Store password as plain text (simplified auth)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password, // Plain text password
        role: role || 'assignee',
        departmentId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentId: true,
        active: true,
      },
    });

    // Return user info with simple token (just user ID)
    res.status(201).json({
      user,
      token: user.id, // Simple token = user ID
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.active) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Simple password comparison (plain text)
    if (user.password !== password) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Return user info with simple token
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
        active: user.active,
      },
      token: user.id, // Simple token = user ID
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
};
