import { Request, Response } from 'express';
import prisma from '../database';

// Simple authentication with MongoDB

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

    // Create user in MongoDB
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password, // Plain text password
        role: role || 'assignee',
        departmentId,
        active: true,
      },
    });

    // Return user info
    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
        active: user.active,
      },
      token: user.id,
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt:', { email });

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Find user in MongoDB
    const user = await prisma.user.findUnique({
      where: { email },
    });

    console.log('User found:', user ? 'Yes' : 'No');

    if (!user || !user.active) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Check password
    if (user.password !== password) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    console.log('Login successful for:', user.email);

    // Return user info with token
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
        active: user.active,
      },
      token: user.id,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
};
