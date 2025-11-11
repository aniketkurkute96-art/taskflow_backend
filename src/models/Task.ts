import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './User';
import { Department } from './Department';
import { TaskStatus, AssigneeType, ApprovalType } from '../types/enums';
import { TaskNode } from './TaskNode';
import { TaskApprover } from './TaskApprover';
import { Comment } from './Comment';
import { ChecklistItem } from './ChecklistItem';
import { Attachment } from './Attachment';
import { ApprovalTemplate } from './ApprovalTemplate';

// Re-export the enums for use in other files
export { TaskStatus, AssigneeType, ApprovalType } from '../types/enums';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'creator_id' })
  creatorId: string;

  @ManyToOne(() => User, user => user.createdTasks)
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @Column({ name: 'assignee_id', nullable: true })
  assigneeId: string | null;

  @ManyToOne(() => User, user => user.assignedTasks, { nullable: true })
  @JoinColumn({ name: 'assignee_id' })
  assignee: User;

  @Column({ name: 'assignee_type', type: 'text', default: AssigneeType.USER })
  assigneeType: AssigneeType;

  @Column({ name: 'department_id', nullable: true })
  departmentId: string | null;

  @ManyToOne(() => Department, department => department.tasks)
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amount: number;

  @Column({ name: 'approval_type', type: 'text' })
  approvalType: ApprovalType;

  @Column({ name: 'approval_template_id', nullable: true })
  approvalTemplateId: string | null;

  @ManyToOne(() => ApprovalTemplate, template => template.tasks)
  @JoinColumn({ name: 'approval_template_id' })
  approvalTemplate: ApprovalTemplate;

  @Column({ name: 'start_date', nullable: true })
  startDate: Date;

  @Column({ name: 'due_date', nullable: true })
  dueDate: Date;

  @Column({
    type: 'text',
    default: TaskStatus.DRAFT
  })
  status: TaskStatus;

  @Column({ name: 'priority', nullable: true })
  priority: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => TaskNode, node => node.task)
  nodes: TaskNode[];

  @OneToMany(() => TaskApprover, approver => approver.task)
  approvers: TaskApprover[];

  @OneToMany(() => Comment, comment => comment.task)
  comments: Comment[];

  @OneToMany(() => ChecklistItem, item => item.task)
  checklistItems: ChecklistItem[];

  @OneToMany(() => Attachment, attachment => attachment.task)
  attachments: Attachment[];

  // Helper methods for task status management
  isPendingApproval(): boolean {
    return this.status === TaskStatus.APPROVAL_PENDING;
  }

  isCompleted(): boolean {
    return this.status === TaskStatus.COMPLETED;
  }

  isApproved(): boolean {
    return this.status === TaskStatus.APPROVED;
  }

  isRejected(): boolean {
    return this.status === TaskStatus.REJECTED;
  }

  isOverdue(): boolean {
    if (!this.dueDate) return false;
    return new Date() > this.dueDate && !this.isCompleted() && !this.isApproved();
  }
}