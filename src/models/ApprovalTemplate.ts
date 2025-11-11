import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Task } from './Task';
import { ApprovalTemplateStage } from './ApprovalTemplateStage';

export interface ApprovalTemplateCondition {
  department?: string;
  amountMin?: number;
  amountMax?: number;
  roles?: string[];
}

@Entity('approval_templates')
export class ApprovalTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json', name: 'condition_json' })
  conditionJson: ApprovalTemplateCondition;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Task, task => task.approvalTemplate)
  tasks: Task[];

  @OneToMany(() => ApprovalTemplateStage, stage => stage.template)
  stages: ApprovalTemplateStage[];

  // Helper method to check if template matches task criteria
  matchesCondition(departmentId: string, amount?: number): boolean {
    const conditions = this.conditionJson;
    
    if (conditions.department && conditions.department !== departmentId) {
      return false;
    }
    
    if (conditions.amountMin !== undefined && amount !== undefined && amount < conditions.amountMin) {
      return false;
    }
    
    if (conditions.amountMax !== undefined && amount !== undefined && amount > conditions.amountMax) {
      return false;
    }
    
    return true;
  }
}