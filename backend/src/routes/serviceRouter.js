import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import supabase from '../db/supabase.js';

const router = express.Router();
router.use(authenticate);

// List services for an agent
router.get('/:agentId', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('services').select('*').eq('agent_id', req.params.agentId).order('name');
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// Create a service
router.post('/', async (req, res, next) => {
  try {
    const { agentId, name, description, price, durationMinutes, active = true } = req.body;
    if (!agentId || !name) return res.status(400).json({ error: 'agentId and name are required' });
    const { data, error } = await supabase
      .from('services')
      .insert({ agent_id: agentId, name, description, price, duration_minutes: durationMinutes, active })
      .select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
});

// Update a service
router.put('/:id', async (req, res, next) => {
  try {
    const { name, description, price, durationMinutes, active } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = price;
    if (durationMinutes !== undefined) updates.duration_minutes = durationMinutes;
    if (active !== undefined) updates.active = active;
    const { data, error } = await supabase.from('services').update(updates).eq('id', req.params.id).select().single();
    if (error || !data) return res.status(404).json({ error: 'Service not found' });
    res.json(data);
  } catch (err) { next(err); }
});

// Delete a service
router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('services').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
