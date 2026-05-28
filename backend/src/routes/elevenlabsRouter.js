import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { synthesize, listVoices } from '../controllers/elevenlabsController.js';

const router = express.Router();
router.get('/voices',   authenticate, listVoices);
router.post('/speech',  authenticate, synthesize);

export default router;
