import { Request, Response } from 'express';

// HARDCODED USERS - No database needed!
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

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required' });
      return;
    }

    // Check if user already exists
    const existingUser = USERS.find(u => u.email === email);
    if (existingUser) {
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    // Create new user
    const newUser = {
      id: String(USERS.length + 1),
      name,
      email,
      password,
      role: role || 'assignee',
      departmentId: '1',
      active: true,
    };

    USERS.push(newUser);

    // Return user info (without password)
    res.status(201).json({
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        departmentId: newUser.departmentId,
        active: newUser.active,
      },
      token: newUser.id,
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt:', { email, password });

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Find user in hardcoded array
    const user = USERS.find(u => u.email === email);

    console.log('User found:', user ? 'Yes' : 'No');

    if (!user) {
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
