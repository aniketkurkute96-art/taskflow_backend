import path from 'path';
import fs from 'fs/promises';
import { Response } from 'express';
import prisma from '../database';
import { AuthRequest } from '../middleware/auth';
import { createActivityLog } from './activityLogController';

export const getTaskAttachments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;

    const attachments = await prisma.attachment.findMany({
      where: { taskId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(attachments);
  } catch (error: any) {
    console.error('Get attachments error:', error);
    res.status(500).json({ error: 'Failed to fetch attachments' });
  }
};

export const uploadAttachment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        creator: { select: { id: true, name: true } },
      },
    });

    if (!task) {
      await fs.unlink(file.path).catch(() => {});
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, name: true, email: true },
    });

    const relativePath = path
      .relative(path.join(__dirname, '../..'), file.path)
      .replace(/\\/g, '/');

    const attachment = await prisma.attachment.create({
      data: {
        taskId,
        userId: req.user!.userId,
        filename: file.originalname,
        filepath: `/${relativePath}`,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await createActivityLog(
      taskId,
      req.user!.userId,
      'attachment_added',
      `${user?.name || 'Someone'} uploaded ${file.originalname}`,
      null,
      file.originalname
    );

    res.status(201).json(attachment);
  } catch (error: any) {
    console.error('Upload attachment error:', error);
    res.status(500).json({ error: 'Failed to upload attachment' });
  }
};

export const deleteAttachment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { taskId, attachmentId } = req.params;

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment || attachment.taskId !== taskId) {
      res.status(404).json({ error: 'Attachment not found' });
      return;
    }

    await prisma.attachment.delete({
      where: { id: attachmentId },
    });

    if (attachment.filepath) {
      const absolutePath = path.join(__dirname, '../..', attachment.filepath);
      await fs.unlink(absolutePath).catch(() => {});
    }

    await createActivityLog(
      taskId,
      req.user!.userId,
      'attachment_removed',
      `Attachment ${attachment.filename} was removed`,
      attachment.filename,
      null
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ error: 'Failed to delete attachment' });
  }
};

