import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';
import { Task } from './Task';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ name: 'parent_id', nullable: true })
  parentId: string | null;

  @ManyToOne(() => Department, department => department.children)
  @JoinColumn({ name: 'parent_id' })
  parent: Department;

  @OneToMany(() => Department, department => department.parent)
  children: Department[];

  @OneToMany(() => User, user => user.department)
  users: User[];

  @OneToMany(() => Task, task => task.department)
  tasks: Task[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}