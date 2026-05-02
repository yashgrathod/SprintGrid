import { Response } from 'express';
import { prisma } from '../server';
import { AuthRequest } from '../middleware/authMiddleware';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

export const upload = multer({ storage });

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  deadline: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  blockedById: z.string().optional().nullable(),
});

export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
    }

    const projectId = req.params.projectId as string;
    const { title, description, priority, status, deadline, startDate, blockedById } = parsed.data;
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Validate project membership
    const membership = await prisma.projectMember.findFirst({
      where: { projectId, userId }
    });
    if (!membership) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (project?.ownerId !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    // Get max position for the given status
    const lastTask = await prisma.task.findFirst({
      where: { projectId, status: status || 'TODO' },
      orderBy: { position: 'desc' }
    });
    const position = lastTask ? lastTask.position + 1024 : 1024;

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority || 'MEDIUM',
        status: status || 'TODO',
        deadline: deadline ? new Date(deadline) : null,
        startDate: startDate ? new Date(startDate) : new Date(),
        blockedById: blockedById || null,
        position,
        projectId,
        createdById: userId
      },
      include: {
        assignee: { select: { id: true, name: true } },
        blockedBy: { select: { id: true, title: true } }
      }
    });

    // Log Activity
    const activity = await prisma.activity.create({
      data: {
        action: 'CREATED_TASK',
        details: { title: task.title },
        userId,
        projectId,
        taskId: task.id
      },
      include: {
        user: { select: { name: true } }
      }
    });

    // Emit Socket Events
    const io = (req as any).io;
    if (io) {
      io.to(`project-${projectId}`).emit('task-created', task);
      io.to(`project-${projectId}`).emit('activity-logged', activity);
    }

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
};

const updateTaskSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  deadline: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  blockedById: z.string().optional().nullable(),
});

export const updateTask = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.params.projectId as string;
    const id = req.params.id as string;
    
    const parsed = updateTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
    }

    const { title, description, priority, status, deadline, createdAt, startDate, blockedById } = parsed.data;

    const dataToUpdate: any = {
      title,
      description,
      priority,
      status,
    };
    
    if (deadline !== undefined) dataToUpdate.deadline = deadline ? new Date(deadline) : null;
    if (createdAt !== undefined && createdAt !== null) dataToUpdate.createdAt = new Date(createdAt);
    if (startDate !== undefined) dataToUpdate.startDate = startDate ? new Date(startDate) : null;
    if (blockedById !== undefined) dataToUpdate.blockedById = blockedById || null;

    const task = await prisma.task.update({
      where: { id },
      data: dataToUpdate,
      include: {
        assignee: { select: { id: true, name: true } },
        blockedBy: { select: { id: true, title: true } }
      }
    });

    const io = (req as any).io;
    if (io) io.to(`project-${projectId}`).emit('task-updated', task);

    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
};

export const uploadAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.params.projectId as string;
    const taskId = req.params.taskId as string;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${file.filename}`;

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        attachments: {
          push: fileUrl
        }
      },
      include: { assignee: { select: { id: true, name: true } } }
    });

    const io = (req as any).io;
    if (io) io.to(`project-${projectId}`).emit('task-updated', task);

    res.status(200).json(task);
  } catch (error) {
    console.error('Attachment upload failed:', error);
    res.status(500).json({ error: 'Failed to upload attachment' });
  }
};

export const moveTask = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.params.projectId as string;
    const id = req.params.id as string;
    const { newStatus, newPosition } = req.body;
    const userId = req.user?.userId;

    const oldTask = await prisma.task.findUnique({ where: { id } });

    const task = await prisma.task.update({
      where: { id },
      data: { status: newStatus, position: newPosition },
      include: { assignee: { select: { id: true, name: true } } }
    });

    if (oldTask?.status !== newStatus && userId) {
      const activity = await prisma.activity.create({
        data: {
          action: 'MOVED_TASK',
          details: { title: task.title, from: oldTask?.status, to: newStatus },
          userId,
          projectId,
          taskId: task.id
        },
        include: { user: { select: { name: true } } }
      });

      const io = (req as any).io;
      if (io) io.to(`project-${projectId}`).emit('activity-logged', activity);
    }

    const io = (req as any).io;
    if (io) {
      io.to(`project-${projectId}`).emit('task-moved', { taskId: id, newStatus, newPosition, task });
    }

    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to move task' });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.params.projectId as string;
    const id = req.params.id as string;
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Validate RBAC for deletion
    const membership = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId, projectId } }
    });
    
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    
    if (project?.ownerId !== userId) {
      if (!membership || membership.role === 'MEMBER') {
        return res.status(403).json({ error: 'Forbidden: Only Admin, Subadmin, or Owner can delete tasks.' });
      }
    }

    const task = await prisma.task.delete({
      where: { id }
    });

    // Log Activity
    const activity = await prisma.activity.create({
      data: {
        action: 'DELETED_TASK',
        details: { title: task.title },
        userId,
        projectId
      },
      include: { user: { select: { name: true } } }
    });

    const io = (req as any).io;
    if (io) {
      io.to(`project-${projectId}`).emit('task-deleted', id);
      io.to(`project-${projectId}`).emit('activity-logged', activity);
    }

    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
};