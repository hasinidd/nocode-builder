import { v4 as uuidv4 } from 'uuid';
import supabase from '../db/supabase.js';

// ── Get available slots for an agent on a given date ─────────────────────────
export const getSlots = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const { date, serviceId } = req.query;

    if (!date) return res.status(400).json({ error: 'date query parameter is required' });

    const { data: slots, error } = await supabase
      .from('availability_slots')
      .select('*, bookings(id)')
      .eq('agent_id', agentId)
      .eq('date', date)
      .order('start_time', { ascending: true });

    if (error) throw error;

    // Mark each slot as available or booked
    const enriched = slots.map(s => ({
      ...s,
      available: !s.bookings || s.bookings.length === 0,
      bookings: undefined // remove nested relation from response
    }));

    res.json(enriched);
  } catch (err) { next(err); }
};

// ── Create a booking ──────────────────────────────────────────────────────────
export const createBooking = async (req, res, next) => {
  try {
    const { agentId, slotId, serviceId, customerName, customerEmail, customerPhone, notes } = req.body;

    // Validate required fields
    if (!slotId || !customerName || !customerEmail) {
      return res.status(400).json({ error: 'slotId, customerName and customerEmail are required' });
    }

    // Verify slot exists and belongs to agent
    const { data: slot } = await supabase
      .from('availability_slots').select('*').eq('id', slotId).eq('agent_id', agentId).single();
    if (!slot) return res.status(404).json({ error: 'Slot not found' });

    // Check for slot conflict — prevent double booking
    const { data: conflict } = await supabase
      .from('bookings')
      .select('id')
      .eq('slot_id', slotId)
      .in('status', ['confirmed', 'pending']);

    if (conflict && conflict.length > 0) {
      return res.status(409).json({ error: 'This slot is already booked. Please choose another time.' });
    }

    const bookingRef = `BK-${Date.now().toString(36).toUpperCase()}`;

    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        id: uuidv4(),
        agent_id: agentId,
        slot_id: slotId,
        service_id: serviceId || null,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
        notes: notes || null,
        status: 'confirmed',
        reference: bookingRef
      })
      .select('*, availability_slots(date, start_time, end_time)')
      .single();

    if (error) throw error;

    // Mark slot as booked
    await supabase.from('availability_slots').update({ is_booked: true }).eq('id', slotId);

    res.status(201).json({ booking, reference: bookingRef });
  } catch (err) { next(err); }
};

// ── Get all bookings for an agent ─────────────────────────────────────────────
export const getBookings = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const { status, from, to, page = 1, limit = 25 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('bookings')
      .select('*, availability_slots(date, start_time, end_time), services(name, duration_minutes)', { count: 'exact' })
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (status) query = query.eq('status', status);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ bookings: data, total: count, page: Number(page), limit: Number(limit) });
  } catch (err) { next(err); }
};

// ── Cancel a booking ──────────────────────────────────────────────────────────
export const cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const { data: booking } = await supabase
      .from('bookings').select('slot_id, status').eq('id', id).single();
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status === 'cancelled') return res.status(400).json({ error: 'Booking already cancelled' });

    await Promise.all([
      supabase.from('bookings').update({ status: 'cancelled', cancel_reason: reason || null }).eq('id', id),
      supabase.from('availability_slots').update({ is_booked: false }).eq('id', booking.slot_id)
    ]);

    res.json({ success: true, message: 'Booking cancelled successfully' });
  } catch (err) { next(err); }
};

// ── Create availability slots for an agent ────────────────────────────────────
export const createSlot = async (req, res, next) => {
  try {
    const { agentId, date, startTime, endTime, recurring = false, weekdays = [] } = req.body;

    const slots = [];
    if (recurring && weekdays.length > 0) {
      // Generate recurring slots for next 4 weeks
      const start = new Date(date);
      for (let week = 0; week < 4; week++) {
        for (const day of weekdays) {
          const d = new Date(start);
          d.setDate(start.getDate() + week * 7 + ((day - start.getDay() + 7) % 7));
          slots.push({ id: uuidv4(), agent_id: agentId, date: d.toISOString().split('T')[0], start_time: startTime, end_time: endTime });
        }
      }
    } else {
      slots.push({ id: uuidv4(), agent_id: agentId, date, start_time: startTime, end_time: endTime });
    }

    const { data, error } = await supabase.from('availability_slots').insert(slots).select();
    if (error) throw error;
    res.status(201).json({ created: data.length, slots: data });
  } catch (err) { next(err); }
};
