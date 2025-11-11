import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../database';

export const getTemplates = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const templates = await prisma.approvalTemplate.findMany({
      include: {
        stages: { orderBy: { levelOrder: 'asc' } },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(templates);
  } catch (error: any) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
};

export const getTemplateById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const template = await prisma.approvalTemplate.findUnique({
      where: { id },
      include: {
        stages: { orderBy: { levelOrder: 'asc' } },
      },
    });

    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    res.json(template);
  } catch (error: any) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
};

export const createTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, conditionJson, isActive, stages } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    // Validate conditionJson
    let parsedConditionJson = {};
    if (conditionJson) {
      try {
        parsedConditionJson =
          typeof conditionJson === 'string' ? JSON.parse(conditionJson) : conditionJson;
      } catch {
        res.status(400).json({ error: 'Invalid conditionJson format' });
        return;
      }
    }

    // Create template with stages
    const template = await prisma.approvalTemplate.create({
      data: {
        name,
        conditionJson: JSON.stringify(parsedConditionJson),
        isActive: isActive !== undefined ? isActive : true,
        stages: {
          create: (stages || []).map((stage: any) => ({
            levelOrder: stage.levelOrder,
            approverType: stage.approverType,
            approverValue: stage.approverValue,
            conditionJson: stage.conditionJson
              ? JSON.stringify(
                  typeof stage.conditionJson === 'string'
                    ? JSON.parse(stage.conditionJson)
                    : stage.conditionJson
                )
              : '{}',
          })),
        },
      },
      include: {
        stages: { orderBy: { levelOrder: 'asc' } },
      },
    });

    res.status(201).json(template);
  } catch (error: any) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
};

export const updateTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, conditionJson, isActive, stages } = req.body;

    // Validate conditionJson if provided
    let parsedConditionJson = undefined;
    if (conditionJson !== undefined) {
      try {
        parsedConditionJson =
          typeof conditionJson === 'string' ? JSON.parse(conditionJson) : conditionJson;
      } catch {
        res.status(400).json({ error: 'Invalid conditionJson format' });
        return;
      }
    }

    // Update template
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (parsedConditionJson !== undefined)
      updateData.conditionJson = JSON.stringify(parsedConditionJson);
    if (isActive !== undefined) updateData.isActive = isActive;

    // If stages provided, delete old and create new
    if (stages !== undefined) {
      await prisma.approvalTemplateStage.deleteMany({
        where: { templateId: id },
      });

      updateData.stages = {
        create: stages.map((stage: any) => ({
          levelOrder: stage.levelOrder,
          approverType: stage.approverType,
          approverValue: stage.approverValue,
          conditionJson: stage.conditionJson
            ? JSON.stringify(
                typeof stage.conditionJson === 'string'
                  ? JSON.parse(stage.conditionJson)
                  : stage.conditionJson
              )
            : '{}',
        })),
      };
    }

    const template = await prisma.approvalTemplate.update({
      where: { id },
      data: updateData,
      include: {
        stages: { orderBy: { levelOrder: 'asc' } },
      },
    });

    res.json(template);
  } catch (error: any) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
};

export const deleteTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if template is used in any tasks
    const tasksUsingTemplate = await prisma.task.count({
      where: { approvalTemplateId: id },
    });

    if (tasksUsingTemplate > 0) {
      res.status(400).json({
        error: 'Cannot delete template that is used in tasks',
        tasksCount: tasksUsingTemplate,
      });
      return;
    }

    await prisma.approvalTemplate.delete({
      where: { id },
    });

    res.json({ message: 'Template deleted successfully' });
  } catch (error: any) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
};
