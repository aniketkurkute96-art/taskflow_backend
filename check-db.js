const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    const userCount = await prisma.user.count();
    const taskCount = await prisma.task.count();
    const taskNodeCount = await prisma.taskNode.count();
    const approverCount = await prisma.taskApprover.count();

    console.log('\n=== DATABASE STATUS ===');
    console.log(`Total Users: ${userCount}`);
    console.log(`Total Tasks: ${taskCount}`);
    console.log(`Total Task Forwards: ${taskNodeCount}`);
    console.log(`Total Approvers: ${approverCount}`);
    
    if (userCount === 0) {
      console.log('\n⚠️  No users found! Run: npm run seed');
    }
    
    if (taskCount === 0) {
      console.log('\n⚠️  No tasks found! Create some tasks first.');
    }

    if (taskNodeCount === 0) {
      console.log('\n⚠️  No forwarded tasks! Forward some tasks to test "Waiting On".');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error checking database:', error.message);
    await prisma.$disconnect();
  }
}

checkDatabase();

