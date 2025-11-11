import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt';
import prisma from '../database';

// NOTE: In production, replace plaintext passwords with bcrypt.hash()
// For prototype, we're using plaintext 'password' for seeded users

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

    // Hash password (in production, always use bcrypt)
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
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

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      user,
      token,
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

    // For seeded users with plaintext 'password', check both
    let isValidPassword = false;
    if (user.password === 'password') {
      // Seeded user with plaintext password
      isValidPassword = password === 'password';
    } else {
      // Hashed password
      isValidPassword = await bcrypt.compare(password, user.password);
    }

    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
        active: user.active,
      },
      token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
};
