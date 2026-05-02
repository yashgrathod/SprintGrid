import { Router } from 'express';
import { generateAiWorkflow } from '../controllers/aiController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router({ mergeParams: true });

router.post('/:projectId/ai-workflow', authenticate, generateAiWorkflow);

export default router;
