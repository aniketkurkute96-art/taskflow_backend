import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApprovalTemplate } from './ApprovalTemplate';
import { ApproverType, DynamicRole } from '../types/approvalTemplate';

export interface ApprovalStageCondition {
  department?: string;
  amountMin?: number;
  amountMax?: number;
  roles?: string[];
}

@Entity('approval_template_stages')
export class ApprovalTemplateStage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_id' })
  templateId: string;

  @ManyToOne(() => ApprovalTemplate, template => template.stages)
  @JoinColumn({ name: 'template_id' })
  template: ApprovalTemplate;

  @Column({ name: 'level_order' })
  levelOrder: number;

  @Column({
    type: 'text'
  })
  approverType: ApproverType;

  @Column({ name: 'approver_value' })
  approverValue: string; // User ID, Role name, or DynamicRole

  @Column({ type: 'json', name: 'condition_json', nullable: true })
  conditionJson: ApprovalStageCondition;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper method to get the actual approver user ID based on context
  getApproverUserId(context: {
    creatorId?: string;
    assigneeId?: string;
    departmentId?: string;
    hodId?: string;
    cfoId?: string;
  }): string | null {
    if (this.approverType === ApproverType.USER) {
      return this.approverValue;
    }
    
    if (this.approverType === ApproverType.ROLE) {
      // This would require a service to find users by role
      return null;
    }
    
    if (this.approverType === ApproverType.DYNAMIC_ROLE) {
      switch (this.approverValue as DynamicRole) {
        case DynamicRole.CREATOR:
          return context.creatorId || null;
        case DynamicRole.ASSIGNEE:
          return context.assigneeId || null;
        case DynamicRole.HOD:
          return context.hodId || null;
        case DynamicRole.CFO:
          return context.cfoId || null;
        default:
          return null;
      }
    }
    
    return null;
  }
}