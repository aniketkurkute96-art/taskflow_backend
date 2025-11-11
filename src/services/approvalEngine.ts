import prisma from '../database';
import { Task, TaskNode, TaskApprover, ApprovalTemplate } from '@prisma/client';
import { createActivityLog } from '../controllers/activityLogController';

/**
 * Match an approval template based on conditionJson
 * Conditions: { department?: string, amount_min?: number }
 */
export const matchTemplate = async (
  task: Task & { department: { name: string } | null }
): Promise<ApprovalTemplate | null> => {
  const templates = await prisma.approvalTemplate.findMany({
    where: { isActive: true },
    include: { stages: { orderBy: { levelOrder: 'asc' } } },
  });

  for (const template of templates) {
    let conditionJson: any = {};
    try {
      conditionJson = JSON.parse(template.conditionJson || '{}');
    } catch {
      continue;
    }

    // Check department match
    if (conditionJson.department) {
      if (!task.department || task.department.name !== conditionJson.department) {
        continue;
      }
    }

    // Check amount_min match
    if (conditionJson.amount_min !== undefined) {
      if (!task.amount || task.amount < conditionJson.amount_min) {
        continue;
      }
    }

    // If we get here, template matches
    return template;
  }

  return null;
};

/**
 * Build backward queue from forward path (for 360 approval)
 * Deduplicates users, reverses order, excludes current completer
 */
export const buildBackwardQueue = async (
  taskId: string,
  excludeUserId: string
): Promise<string[]> => {
  const nodes = await prisma.taskNode.findMany({
    where: { taskId },
    orderBy: { forwardedAt: 'asc' },
    include: {
      fromUser: true,
      toUser: true,
    },
  });

  // Extract unique user IDs from forward path (excluding completer)
  const userIds = new Set<string>();
  for (const node of nodes) {
    if (node.fromUserId !== excludeUserId) {
      userIds.add(node.fromUserId);
    }
    if (node.toUserId !== excludeUserId) {
      userIds.add(node.toUserId);
    }
  }

  // Reverse the order (last forward becomes first approver)
  const uniqueUsers = Array.from(userIds);
  return uniqueUsers.reverse();
};

/**
 * Generate TaskApprover entries from template stages
 */
export const generateTaskApproversFromTemplate = async (
  taskId: string,
  template: ApprovalTemplate & { stages: any[] }
): Promise<TaskApprover[]> => {
  const approvers: TaskApprover[] = [];

  for (const stage of template.stages) {
    let approverUserId: string | null = null;

    // Resolve approver based on type
    if (stage.approverType === 'user') {
      approverUserId = stage.approverValue;
    } else if (stage.approverType === 'role') {
      // Find user with matching role
      const user = await prisma.user.findFirst({
        where: { role: stage.approverValue, active: true },
      });
      if (user) approverUserId = user.id;
    } else if (stage.approverType === 'dynamic_role') {
      // Handle dynamic roles like 'HOD'
      if (stage.approverValue === 'HOD') {
        // Get task's department HOD
        const task = await prisma.task.findUnique({
          where: { id: taskId },
          include: { department: true },
        });
        if (task?.departmentId) {
          const hod = await prisma.user.findFirst({
            where: {
              departmentId: task.departmentId,
              role: 'hod',
              active: true,
            },
          });
          if (hod) approverUserId = hod.id;
        }
      } else if (stage.approverValue === 'CFO') {
        const cfo = await prisma.user.findFirst({
          where: { role: 'cfo', active: true },
        });
        if (cfo) approverUserId = cfo.id;
      }
    }

    if (approverUserId) {
      const approver = await prisma.taskApprover.create({
        data: {
          taskId,
          levelOrder: stage.levelOrder,
          approverUserId,
          status: 'pending',
        },
      });
      approvers.push(approver);
    }
  }

  return approvers;
};

/**
 * Generate TaskApprover entries for 360 approval
 */
export const generateTaskApprovers360 = async (
  taskId: string,
  excludeUserId: string
): Promise<TaskApprover[]> => {
  const userIds = await buildBackwardQueue(taskId, excludeUserId);
  const approvers: TaskApprover[] = [];

  for (let i = 0; i < userIds.length; i++) {
    const approver = await prisma.taskApprover.create({
      data: {
        taskId,
        levelOrder: i + 1,
        approverUserId: userIds[i],
        status: 'pending',
      },
    });
    approvers.push(approver);
  }

  return approvers;
};

/**
 * Process task completion and trigger approval engine
 */
export const processTaskCompletion = async (
  taskId: string,
  completerUserId: string
): Promise<{ success: boolean; error?: string; approvers: TaskApprover[] }> => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      department: true,
      approvalTemplate: { include: { stages: { orderBy: { levelOrder: 'asc' } } } },
    },
  });

  if (!task) {
    return { success: false, error: 'Task not found', approvers: [] };
  }

  if (task.status === 'approved' || task.status === 'completed') {
    return { success: false, error: 'Task already completed', approvers: [] };
  }

  let approvers: TaskApprover[] = [];

  if (task.approvalType === '360') {
    // Build backward queue from forward path
    approvers = await generateTaskApprovers360(taskId, completerUserId);
    if (approvers.length === 0) {
      return { success: false, error: 'No approvers found in forward path', approvers: [] };
    }
  } else if (task.approvalType === 'specific') {
    // Require pre-existing manual approver entries
    const existingApprovers = await prisma.taskApprover.findMany({
      where: { taskId },
    });
    if (existingApprovers.length === 0) {
      return { success: false, error: 'No manual approvers specified', approvers: [] };
    }
    approvers = existingApprovers;
  } else if (task.approvalType === 'predefined') {
    // Match template and populate approvers
    if (!task.approvalTemplateId) {
      // Try to match by conditions
      const matchedTemplate = await matchTemplate(task as any);
      if (!matchedTemplate) {
        return { success: false, error: 'No matching approval template found', approvers: [] };
      }
      approvers = await generateTaskApproversFromTemplate(taskId, matchedTemplate as any);
    } else if (task.approvalTemplate) {
      approvers = await generateTaskApproversFromTemplate(taskId, task.approvalTemplate as any);
    } else {
      return { success: false, error: 'Approval template not found', approvers: [] };
    }
  }

  // Update task status
  await prisma.task.update({
    where: { id: taskId },
    data: { status: 'pending_approval' },
  });

  // Create activity log for task completion submission
  await createActivityLog(
    taskId,
    completerUserId,
    'submitted_for_approval',
    `Task submitted for approval (${task.approvalType} approval type)`,
    'in_progress',
    'pending_approval'
  );

  return { success: true, approvers };
};

/**
 * Process approval action
 */
export const processApproval = async (
  taskId: string,
  approverUserId: string
): Promise<{ success: boolean; error?: string; isComplete: boolean }> => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { approvers: { orderBy: { levelOrder: 'asc' } } },
  });

  if (!task) {
    return { success: false, error: 'Task not found', isComplete: false };
  }

  // Find current pending approver for this user
  const currentApprover = task.approvers.find(
    (a) => a.approverUserId === approverUserId && a.status === 'pending'
  );

  if (!currentApprover) {
    return { success: false, error: 'No pending approval found for this user', isComplete: false };
  }

  // Check if all previous levels are approved
  const previousApprovers = task.approvers.filter(
    (a) => a.levelOrder < currentApprover.levelOrder
  );
  const allPreviousApproved = previousApprovers.every((a) => a.status === 'approved');

  if (!allPreviousApproved && previousApprovers.length > 0) {
    return {
      success: false,
      error: 'Previous approval levels must be completed first',
      isComplete: false,
    };
  }

  // Mark this approver as approved
  await prisma.taskApprover.update({
    where: { id: currentApprover.id },
    data: {
      status: 'approved',
      actionAt: new Date(),
    },
  });

  // Get approver name for logging
  const approverUser = await prisma.user.findUnique({
    where: { id: approverUserId },
    select: { name: true },
  });

  // Create activity log for approval
  await createActivityLog(
    taskId,
    approverUserId,
    'approved',
    `Approved by ${approverUser?.name || 'Unknown'} (Level ${currentApprover.levelOrder})`,
    'pending',
    'approved'
  );

  // Check if this was the last approver
  const remainingApprovers = task.approvers.filter((a) => a.status === 'pending');
  const isComplete = remainingApprovers.length === 1; // This was the last one

  if (isComplete) {
    // Mark task as approved
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'approved' },
    });

    // Create activity log for final approval
    await createActivityLog(
      taskId,
      approverUserId,
      'completed',
      `Task fully approved and completed`,
      'pending_approval',
      'approved'
    );

    // TODO: Send notification to creator (console log for now)
    console.log(`Task ${taskId} approved. Notifying creator ${task.creatorId}`);
  }

  return { success: true, isComplete };
};

/**
 * Process rejection action
 */
export const processRejection = async (
  taskId: string,
  approverUserId: string,
  forwardToUserId?: string
): Promise<{ success: boolean; error?: string }> => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { approvers: true },
  });

  if (!task) {
    return { success: false, error: 'Task not found' };
  }

  // Find current pending approver
  const currentApprover = task.approvers.find(
    (a) => a.approverUserId === approverUserId && a.status === 'pending'
  );

  if (!currentApprover) {
    return { success: false, error: 'No pending approval found for this user' };
  }

  // Mark approver as rejected
  await prisma.taskApprover.update({
    where: { id: currentApprover.id },
    data: {
      status: 'rejected',
      actionAt: new Date(),
    },
  });

  // Determine who to forward back to
  const targetUserId = forwardToUserId || task.assigneeId || task.creatorId;
  if (!targetUserId) {
    return { success: false, error: 'No target user found for rejection' };
  }

  // Get user names for logging
  const approverUser = await prisma.user.findUnique({
    where: { id: approverUserId },
    select: { name: true },
  });
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { name: true },
  });

  // Create activity log for rejection
  await createActivityLog(
    taskId,
    approverUserId,
    'rejected',
    `Rejected by ${approverUser?.name || 'Unknown'} and sent back to ${targetUser?.name || 'Unknown'}`,
    'pending_approval',
    'rejected'
  );

  // Create forward node back to assignee/creator
  await prisma.taskNode.create({
    data: {
      taskId,
      fromUserId: approverUserId,
      toUserId: targetUserId,
    },
  });

  // Update task assignee and status
  await prisma.task.update({
    where: { id: taskId },
    data: {
      assigneeId: targetUserId,
      status: 'rejected',
    },
  });

  // Clear all approvers so flow can restart when completed again
  await prisma.taskApprover.deleteMany({
    where: { taskId },
  });

  // TODO: Send notification (console log for now)
  console.log(`Task ${taskId} rejected by ${approverUserId}. Forwarded to ${targetUserId}`);

  return { success: true };
};

