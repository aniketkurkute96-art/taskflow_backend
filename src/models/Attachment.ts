import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Task } from './Task';

@Entity('attachments')
export class Attachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id' })
  taskId: string;

  @ManyToOne(() => Task, task => task.attachments)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column()
  filename: string;

  @Column()
  originalName: string;

  @Column()
  mimeType: string;

  @Column({ type: 'text', nullable: true })
  filePath: string;

  @Column({ type: 'text', nullable: true })
  fileData: string; // Base64 encoded for prototype

  @Column({ type: 'int' })
  fileSize: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}