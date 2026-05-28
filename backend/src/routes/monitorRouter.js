import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { getStats, getLogs } from '../controllers/monitorController.js';

const router = express.Router();

router.use(authenticate);
router.get('/:agentId/stats', getStats);
router.get('/:agentId/logs',  getLogs);

export default router;
