import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting MongoDB database seed...');

  // Clear existing data
  console.log('Clearing existing data...');
  await prisma.taskApprover.deleteMany();
  await prisma.taskNode.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.task.deleteMany();
  await prisma.approvalTemplateStage.deleteMany();
  await prisma.approvalTemplate.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  // Create Departments
  console.log('Creating departments...');
  const operationsDept = await prisma.department.create({
    data: {
      name: 'Operations',
    },
  });

  const accountsDept = await prisma.department.create({
    data: {
      name: 'Accounts',
    },
  });

  const financeDept = await prisma.department.create({
    data: {
      name: 'Finance',
    },
  });

  // Create Users
  console.log('Creating users...');
  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'pass-word',
      role: 'admin',
      active: true,
    },
  });

  const creator = await prisma.user.create({
    data: {
      name: 'Task Creator',
      email: 'creator@example.com',
      password: 'password', // Plaintext for prototype
      role: 'creator',
      departmentId: operationsDept.id,
      active: true,
    },
  });

  const hod = await prisma.user.create({
    data: {
      name: 'Head of Department',
      email: 'hod@example.com',
      password: 'password', // Plaintext for prototype
      role: 'hod',
      departmentId: accountsDept.id,
      active: true,
    },
  });

  const cfo = await prisma.user.create({
    data: {
      name: 'Chief Financial Officer',
      email: 'cfo@example.com',
      password: 'password', // Plaintext for prototype
      role: 'cfo',
      departmentId: financeDept.id,
      active: true,
    },
  });

  const assignee = await prisma.user.create({
    data: {
      name: 'Task Assignee',
      email: 'assignee@example.com',
      password: 'password', // Plaintext for prototype
      role: 'assignee',
      departmentId: operationsDept.id,
      active: true,
    },
  });

  // Create Approval Templates
  console.log('Creating approval templates...');

  // Template 1: Vendor Bill Approval for Accounts (amount >= 100000)
  const vendorBillTemplate = await prisma.approvalTemplate.create({
    data: {
      name: 'Vendor Bill Approval',
      conditionJson: JSON.stringify({
        department: 'Accounts',
        amount_min: 100000,
      }),
      isActive: true,
      stages: {
        create: [
          {
            levelOrder: 1,
            approverType: 'dynamic_role',
            approverValue: 'HOD',
            conditionJson: '{}',
          },
          {
            levelOrder: 2,
            approverType: 'dynamic_role',
            approverValue: 'CFO',
            conditionJson: '{}',
          },
        ],
      },
    },
  });

  // Template 2: General Expense Approval (amount >= 50000)
  const expenseTemplate = await prisma.approvalTemplate.create({
    data: {
      name: 'General Expense Approval',
      conditionJson: JSON.stringify({
        amount_min: 50000,
      }),
      isActive: true,
      stages: {
        create: [
          {
            levelOrder: 1,
            approverType: 'dynamic_role',
            approverValue: 'HOD',
            conditionJson: '{}',
          },
        ],
      },
    },
  });

  // Create sample tasks with activity logs
  console.log('Creating sample tasks...');
  
  const sampleTask1 = await prisma.task.create({
    data: {
      title: 'Q4 Budget Review - Marketing Campaign',
      description: 'Review and approve the marketing campaign budget for Q4 2025. The campaign includes digital ads, social media promotions, and influencer partnerships.',
      status: 'in_progress',
      approvalType: 'predefined',
      amount: 75000,
      priorityFlag: 'HIGH',
      priorityNotes: 'Urgent: Campaign launch scheduled for next week',
      startDate: new Date('2025-11-10'),
      dueDate: new Date('2025-11-20'),
      recurrenceType: 'none',
      creatorId: creator.id,
      assigneeId: assignee.id,
      departmentId: operationsDept.id,
    },
  });

  const sampleTask2 = await prisma.task.create({
    data: {
      title: 'Vendor Payment - Office Supplies',
      description: 'Approve payment to ABC Supplies for office furniture and equipment.',
      status: 'open',
      approvalType: 'specific',
      amount: 15000,
      priorityFlag: 'MEDIUM',
      startDate: new Date('2025-11-12'),
      dueDate: new Date('2025-11-25'),
      recurrenceType: 'none',
      creatorId: admin.id,
      assigneeId: assignee.id,
      departmentId: accountsDept.id,
    },
  });

  // Add activity logs to sample task 1
  await prisma.activityLog.create({
    data: {
      taskId: sampleTask1.id,
      action: 'created',
      description: `Task created by ${creator.name}`,
      userId: creator.id,
      createdAt: new Date('2025-11-10T09:00:00Z'),
    },
  });

  await prisma.activityLog.create({
    data: {
      taskId: sampleTask1.id,
      action: 'assigned',
      description: `Task assigned to ${assignee.name} in ${operationsDept.name} department`,
      userId: creator.id,
      createdAt: new Date('2025-11-10T09:05:00Z'),
    },
  });

  await prisma.activityLog.create({
    data: {
      taskId: sampleTask1.id,
      action: 'status_changed',
      description: `Status changed from open to in_progress`,
      oldValue: 'open',
      newValue: 'in_progress',
      userId: assignee.id,
      createdAt: new Date('2025-11-10T14:30:00Z'),
    },
  });

  // Add a comment to sample task 1
  await prisma.comment.create({
    data: {
      taskId: sampleTask1.id,
      content: 'Started working on the budget analysis. Will have initial numbers by EOD.',
      userId: assignee.id,
      createdAt: new Date('2025-11-10T15:00:00Z'),
    },
  });

  // Add activity logs to sample task 2
  await prisma.activityLog.create({
    data: {
      taskId: sampleTask2.id,
      action: 'created',
      description: `Task created by ${admin.name}`,
      userId: admin.id,
      createdAt: new Date('2025-11-12T10:00:00Z'),
    },
  });

  await prisma.activityLog.create({
    data: {
      taskId: sampleTask2.id,
      action: 'assigned',
      description: `Task assigned to ${assignee.name} in ${accountsDept.name} department`,
      userId: admin.id,
      createdAt: new Date('2025-11-12T10:05:00Z'),
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log('\n📋 Seeded Users:');
  console.log('  - admin@example.com (password: pass-word)');
  console.log('  - creator@example.com (password: password)');
  console.log('  - hod@example.com (password: password)');
  console.log('  - cfo@example.com (password: password)');
  console.log('  - assignee@example.com (password: password)');
  console.log('\n📋 Seeded Templates:');
  console.log(`  - ${vendorBillTemplate.name} (Accounts, amount >= 100000)`);
  console.log(`  - ${expenseTemplate.name} (amount >= 50000)`);
  console.log('\n📋 Seeded Tasks:');
  console.log(`  - ${sampleTask1.title} (${sampleTask1.status})`);
  console.log(`  - ${sampleTask2.title} (${sampleTask2.status})`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
