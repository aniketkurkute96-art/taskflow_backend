import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Task } from './Task';
import { User } from './User';
import { ApproverStatus } from '../types/approval';

@Entity('task_approvers')
export class TaskApprover {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id' })
  taskId: string;

  @ManyToOne(() => Task, task => task.approvers)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ name: 'level_order' })
  levelOrder: number;

  @Column({ name: 'approver_user_id' })
  approverUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'approver_user_id' })
  approverUser: User;

  @Column({
    type: 'text',
    default: ApproverStatus.PENDING
  })
  status: ApproverStatus;

  @Column({ name: 'action_at', nullable: true })
  actionAt: Date;

  @Column({ type: 'text', nullable: true })
  comments: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Helper methods
  isApproved(): boolean {
    return this.status === ApproverStatus.APPROVED;
  }

  isRejected(): boolean {
    return this.status === ApproverStatus.REJECTED;
  }

  isPending(): boolean {
    return this.status === ApproverStatus.PENDING;
  }
}