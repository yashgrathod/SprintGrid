import { Router } from 'express';
import { getProjects, createProject, getProjectDetails, updateProjectStatus } from '../controllers/projectController';
import { createInvite, validateInvite, acceptInvite } from '../controllers/inviteController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/', getProjects);
router.post('/', createProject);
router.get('/:id', getProjectDetails);
router.patch('/:id/status', updateProjectStatus);

// Invites
router.post('/:projectId/invites', createInvite);
router.get('/invites/:token', validateInvite);
router.post('/invites/:token/accept', acceptInvite);

export default router;
