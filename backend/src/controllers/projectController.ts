import { Response } from 'express';
import { prisma } from '../server';
import { AuthRequest } from '../middleware/authMiddleware';
import crypto from 'crypto';

export const getProjects = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const systemRole = req.user?.role; // `role` in jwt is actually the systemRole from generating
    
    let whereClause = {};
    if (systemRole !== 'ADMIN') {
      whereClause = {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } }
        ]
      };
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

export const createProject = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, members } = req.body;
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const project = await prisma.project.create({
      data: {
        title,
        description,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: 'ADMIN'
          }
        }
      },
      include: {
        owner: { select: { id: true, name: true, email: true } }
      }
    });

    // Create invites for members if provided
    if (members && Array.isArray(members)) {
      const invites = members.map((member: { email: string, role: string }) => {
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        return {
          email: member.email,
          // This is the explicit cast that fixes the TypeScript crash
          role: (member.role === 'ADMIN' || member.role === 'OWNER') ? member.role as "ADMIN" | "OWNER" | "MEMBER" : "MEMBER",
          token,
          projectId: project.id,
          expiresAt
        };
      });

      if (invites.length > 0) {
        await prisma.projectInvite.createMany({
          data: invites
        });

        // Log URLs for now
        invites.forEach(inv => console.log(`Invite URL for ${inv.email}: http://localhost:3000/invite/${inv.token}`));
      }
    }

    res.status(201).json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create project' });
  }
};

export const getProjectDetails = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.userId;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true } },
            blockedBy: { select: { id: true, title: true } }
          },
          orderBy: { position: 'asc' }
        }
      }
    });

    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Validate access
    const isOwner = project.ownerId === userId;
    const isMember = project.members.some(m => m.userId === userId);

    if (!isOwner && !isMember) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project details' });
  }
};

export const updateProjectStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.userId;
    const { status } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const membership = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId, projectId: id } }
    });

    if (project.ownerId !== userId) {
      if (!membership || membership.role === 'MEMBER') {
        return res.status(403).json({ error: 'Forbidden: Only Admin or Owner can update project status.' });
      }
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: { status }
    });

    res.status(200).json(updatedProject);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project status' });
  }
};