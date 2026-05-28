import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { createEvent } from '../controllers/googleCalendarController.js';

const router = express.Router();
router.post('/events', authenticate, createEvent);

export default router;
