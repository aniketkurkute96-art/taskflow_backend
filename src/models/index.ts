export { User, UserRole } from './User';
export { Department } from './Department';
export { Task, TaskStatus, AssigneeType, ApprovalType } from './Task';
export { TaskNode } from './TaskNode';
export { TaskApprover } from './TaskApprover';
export { Comment } from './Comment';
export { Attachment } from './Attachment';
export { ChecklistItem } from './ChecklistItem';
export { ApprovalTemplate } from './ApprovalTemplate';
export { ApprovalTemplateStage } from './ApprovalTemplateStage';

// Import and export enums from their original locations
export { ApproverStatus } from '../types/approval';
export { ApproverType, DynamicRole } from '../types/approvalTemplate';