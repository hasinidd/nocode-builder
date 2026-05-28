import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { getToken, transcribe } from '../controllers/deepgramController.js';
import { uploadMiddleware } from '../middlewares/uploadMiddleware.js';

const router = express.Router();
router.get('/token',        authenticate, getToken);
router.post('/transcribe',  authenticate, uploadMiddleware.single('audio'), transcribe);

export default router;
