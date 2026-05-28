import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import supabase from '../db/supabase.js';

const router = express.Router();
router.post('/buy', authenticate, async (req, res, next) => {
  try {
    const { addonType, quantity } = req.body;
    const { data, error } = await supabase
      .from('addon_purchases')
      .insert({ user_id: req.user.id, addon_type: addonType, quantity, status: 'completed' })
      .select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
});

export default router;
