import { Response } from 'express';
import { prisma } from '../server';
import { AuthRequest } from '../middleware/authMiddleware';

export const getActivities = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.params.projectId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const skip = (page - 1) * limit;

    const [activities, totalCount] = await Promise.all([
      prisma.activity.findMany({
        where: { projectId },
        include: {
          user: { select: { name: true } },
          task: { select: { title: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.activity.count({ where: { projectId } })
    ]);

    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = page < totalPages;

    res.status(200).json({ activities, totalPages, currentPage: page, hasMore });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
};
