import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { uploadMiddleware } from '../middlewares/uploadMiddleware.js';
import { uploadDocument, uploadImage } from '../controllers/uploadController.js';

const router = express.Router();

router.post('/document', authenticate, uploadMiddleware.single('file'), uploadDocument);
router.post('/image',    authenticate, uploadMiddleware.single('file'), uploadImage);

export default router;
