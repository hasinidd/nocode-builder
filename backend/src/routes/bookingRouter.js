import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { getSlots, createBooking, cancelBooking } from '../controllers/bookingController.js';

const router = express.Router();

router.use(authenticate);
router.get('/slots/:agentId',  getSlots);
router.post('/',               createBooking);
router.delete('/:id',          cancelBooking);

export default router;
