import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// NOTE: In production, replace plaintext 'password' with bcrypt.hash('password', 10)
// For prototype, we're using plaintext 'password' for all seeded users

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data (optional - comment out if you want to preserve data)
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
      password: 'password', // Plaintext for prototype - use bcrypt in production
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

  console.log('✅ Seed completed successfully!');
  console.log('\n📋 Seeded Users:');
  console.log('  - admin@example.com (password: password)');
  console.log('  - creator@example.com (password: password)');
  console.log('  - hod@example.com (password: password)');
  console.log('  - cfo@example.com (password: password)');
  console.log('  - assignee@example.com (password: password)');
  console.log('\n📋 Seeded Templates:');
  console.log(`  - ${vendorBillTemplate.name} (Accounts, amount >= 100000)`);
  console.log(`  - ${expenseTemplate.name} (amount >= 50000)`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
