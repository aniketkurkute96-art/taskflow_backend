const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAuth() {
  try {
    // Get admin user
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@ex.com' }
    });

    if (!admin) {
      console.log('❌ Admin user not found! Run: npm run seed');
      return;
    }

    console.log('\n=== USER INFO ===');
    console.log('ID:', admin.id);
    console.log('Name:', admin.name);
    console.log('Email:', admin.email);
    console.log('Role:', admin.role);

    // Check waiting on tasks for this user
    const waitingOn = await prisma.taskNode.findMany({
      where: { fromUserId: admin.id },
      include: {
        task: true,
        toUser: true
      }
    });

    console.log('\n=== WAITING ON TASKS ===');
    console.log(`Total: ${waitingOn.length}`);
    waitingOn.forEach((node, i) => {
      console.log(`${i + 1}. ${node.task.title} → ${node.toUser.name}`);
    });

    // Check approvals for this user
    const approvals = await prisma.taskApprover.findMany({
      where: { approverUserId: admin.id },
      include: {
        task: true
      }
    });

    console.log('\n=== APPROVALS ===');
    console.log(`Total: ${approvals.length}`);
    approvals.forEach((approval, i) => {
      console.log(`${i + 1}. ${approval.task.title} - Status: ${approval.status}`);
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
  }
}

testAuth();

