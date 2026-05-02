import { Response } from 'express';
import { prisma } from '../server';
import { AuthRequest } from '../middleware/authMiddleware';
import crypto from 'crypto';

export const createInvite = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.params.projectId as string;
    const { email, role } = req.body;
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true }
    });

    if (!project) return res.status(404).json({ error: 'Project not found' });

    const isOwner = project.ownerId === userId;
    const member = project.members.find(m => m.userId === userId);
    const isAdmin = member?.role === 'ADMIN' || member?.role === 'OWNER';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden. Only admins or owners can invite.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const invite = await prisma.projectInvite.create({
      data: {
        email,
        role: role || 'MEMBER',
        token,
        projectId,
        expiresAt
      }
    });

    // Console log the invite URL instead of emailing for now
    console.log(`Invite URL: http://localhost:5173/invite/${token}`);

    res.status(201).json({ message: 'Invite created successfully', invite });
  } catch (error) {
    console.error('Create invite error:', error);
    res.status(500).json({ error: 'Failed to create invite' });
  }
};

export const validateInvite = async (req: AuthRequest, res: Response) => {
  try {
    const token = req.params.token as string;
    
    const invite = await prisma.projectInvite.findUnique({
      where: { token },
      include: { project: true }
    });

    if (!invite) return res.status(404).json({ error: 'Invite not found' });
    if (invite.expiresAt < new Date()) return res.status(400).json({ error: 'Invite expired' });

    res.status(200).json({ invite, project: invite.project });
  } catch (error) {
    console.error('Validate invite error:', error);
    res.status(500).json({ error: 'Failed to validate invite' });
  }
};

export const acceptInvite = async (req: AuthRequest, res: Response) => {
  try {
    const token = req.params.token as string;
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const invite = await prisma.projectInvite.findUnique({
      where: { token }
    });

    if (!invite) return res.status(404).json({ error: 'Invite not found' });
    if (invite.expiresAt < new Date()) return res.status(400).json({ error: 'Invite expired' });

    // Check if user is already a member
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId: invite.projectId
        }
      }
    });

    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member of this project' });
    }

    // Add user as member
    await prisma.projectMember.create({
      data: {
        userId,
        projectId: invite.projectId,
        role: invite.role
      }
    });

    // Delete the invite after use
    await prisma.projectInvite.delete({
      where: { id: invite.id }
    });

    res.status(200).json({ message: 'Invite accepted successfully', projectId: invite.projectId });
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({ error: 'Failed to accept invite' });
  }
};
