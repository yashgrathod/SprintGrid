import { Router } from 'express';
import { createTask, updateTask, moveTask, upload, uploadAttachment, deleteTask } from '../controllers/taskController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post('/', createTask);
router.put('/:id', updateTask);
router.patch('/:id/move', moveTask);
router.post('/:taskId/attachments', upload.single('file'), uploadAttachment);
router.delete('/:id', deleteTask);

export default router;
