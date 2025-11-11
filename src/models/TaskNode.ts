import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Task } from './Task';
import { User } from './User';

@Entity('task_nodes')
export class TaskNode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id' })
  taskId: string;

  @ManyToOne(() => Task, task => task.nodes)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ name: 'from_user_id', nullable: true })
  fromUserId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'from_user_id' })
  fromUser: User;

  @Column({ name: 'to_user_id' })
  toUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'to_user_id' })
  toUser: User;

  @Column({ name: 'forwarded_at', default: () => 'CURRENT_TIMESTAMP' })
  forwardedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;
}