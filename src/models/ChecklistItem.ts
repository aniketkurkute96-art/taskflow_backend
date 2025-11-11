import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Task } from './Task';

@Entity('checklist_items')
export class ChecklistItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id' })
  taskId: string;

  @ManyToOne(() => Task, task => task.checklistItems)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: false })
  completed: boolean;

  @Column({ name: 'completed_at', nullable: true })
  completedAt: Date;

  @Column({ name: 'order_index', default: 0 })
  orderIndex: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}