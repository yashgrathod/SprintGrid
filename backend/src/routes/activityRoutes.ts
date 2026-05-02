import { Router } from 'express';
import { getActivities } from '../controllers/activityController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', getActivities);

export default router;
