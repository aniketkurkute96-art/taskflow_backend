import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Department } from './Department';
import { Task } from './Task';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  HOD = 'hod',
  CFO = 'cfo'
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column()
  password: string; // Note: Plain text for prototype - add bcrypt hashing for production

  @Column({
    type: 'text',
    default: UserRole.USER
  })
  role: UserRole;

  @Column({ name: 'department_id', nullable: true })
  departmentId: string | null;

  @ManyToOne(() => Department, department => department.users)
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Task, task => task.creator)
  createdTasks: Task[];

  @OneToMany(() => Task, task => task.assignee)
  assignedTasks: Task[];

  // Helper method to check if user has admin privileges
  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  // Helper method to check if user is HOD
  isHOD(): boolean {
    return this.role === UserRole.HOD;
  }

  // Helper method to check if user is CFO
  isCFO(): boolean {
    return this.role === UserRole.CFO;
  }
}