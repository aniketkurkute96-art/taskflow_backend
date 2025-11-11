import request from 'supertest';
import { app } from '../server';
import prisma from '../database';

describe('Approval Flow Integration Tests', () => {
  let authToken: string;
  let creatorToken: string;
  let hodToken: string;
  let cfoToken: string;
  let taskId: string;

  beforeAll(async () => {
    // Login as admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'password' });
    authToken = adminRes.body.token;

    // Login as creator
    const creatorRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'password' });
    creatorToken = creatorRes.body.token;

    // Login as HOD
    const hodRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'hod@example.com', password: 'password' });
    hodToken = hodRes.body.token;

    // Login as CFO
    const cfoRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'cfo@example.com', password: 'password' });
    cfoToken = cfoRes.body.token;
  });

  test('Create task with 360 approval', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        title: 'Test 360 Task',
        description: 'Testing 360 approval flow',
        approvalType: '360',
      });

    expect(response.status).toBe(201);
    expect(response.body.title).toBe('Test 360 Task');
    taskId = response.body.id;
  });

  test('Forward task creates node', async () => {
    // Get assignee user
    const usersRes = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${authToken}`);
    
    const assignee = usersRes.body.find((u: any) => u.email === 'assignee@example.com');

    const response = await request(app)
      .post(`/api/tasks/${taskId}/forward`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ toUserId: assignee.id });

    expect(response.status).toBe(200);
    expect(response.body.toUserId).toBe(assignee.id);
  });

  test('Complete task triggers approval', async () => {
    // Get assignee token
    const assigneeRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'assignee@example.com', password: 'password' });
    const assigneeToken = assigneeRes.body.token;

    const response = await request(app)
      .post(`/api/tasks/${taskId}/complete`)
      .set('Authorization', `Bearer ${assigneeToken}`);

    expect(response.status).toBe(200);
    expect(response.body.task.status).toBe('pending_approval');
  });

  test('Approval bucket shows pending task', async () => {
    const response = await request(app)
      .get('/api/tasks/approval/bucket')
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('Create task with predefined template', async () => {
    // Get Accounts department
    const deptsRes = await request(app)
      .get('/api/departments')
      .set('Authorization', `Bearer ${creatorToken}`);
    
    const accountsDept = deptsRes.body.find((d: any) => d.name === 'Accounts');

    const response = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        title: 'Vendor Bill Payment',
        description: 'High value payment',
        approvalType: 'predefined',
        departmentId: accountsDept.id,
        amount: 150000,
      });

    expect(response.status).toBe(201);
    expect(response.body.approvalType).toBe('predefined');
  });
});

describe('Auth Tests', () => {
  test('Login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'password' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
  });

  test('Login with invalid credentials fails', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'wrongpassword' });

    expect(response.status).toBe(401);
  });
});


