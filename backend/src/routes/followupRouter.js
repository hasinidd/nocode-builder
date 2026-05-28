import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { schedule, triggerQueue } from '../controllers/followupController.js';

const router = express.Router();
router.post('/schedule', authenticate, schedule);
router.post('/process',  authenticate, triggerQueue);

export default router;
