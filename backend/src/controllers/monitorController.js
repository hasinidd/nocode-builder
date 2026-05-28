import supabase from '../db/supabase.js';

// ── Get stats summary for an agent ───────────────────────────────────────────
export const getStats = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const { from, to } = req.query;

    let query = supabase.from('chat_logs').select('*', { count: 'exact', head: true }).eq('agent_id', agentId);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const [
      { count: totalMessages },
      { count: successCount },
      { count: bookingTriggers },
      { count: orderTriggers },
      { count: leadTriggers },
      { data: timings }
    ] = await Promise.all([
      supabase.from('chat_logs').select('*', { count: 'exact', head: true }).eq('agent_id', agentId),
      supabase.from('chat_logs').select('*', { count: 'exact', head: true }).eq('agent_id', agentId).eq('success', true),
      supabase.from('chat_logs').select('*', { count: 'exact', head: true }).eq('agent_id', agentId).eq('action_triggered', 'booking'),
      supabase.from('chat_logs').select('*', { count: 'exact', head: true }).eq('agent_id', agentId).eq('action_triggered', 'order'),
      supabase.from('chat_logs').select('*', { count: 'exact', head: true }).eq('agent_id', agentId).eq('action_triggered', 'lead'),
      supabase.from('chat_logs').select('response_ms').eq('agent_id', agentId).eq('success', true).limit(200)
    ]);

    const avgResponseMs = timings?.length
      ? Math.round(timings.reduce((s, r) => s + (r.response_ms || 0), 0) / timings.length)
      : 0;

    res.json({
      totalMessages: totalMessages || 0,
      successRate: totalMessages ? ((successCount / totalMessages) * 100).toFixed(1) : '0.0',
      avgResponseMs,
      actions: { booking: bookingTriggers || 0, order: orderTriggers || 0, lead: leadTriggers || 0 }
    });
  } catch (err) { next(err); }
};

// ── Get interaction logs for an agent ────────────────────────────────────────
export const getLogs = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const { page = 1, limit = 50, success, action } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('chat_logs')
      .select('id, session_id, user_message, agent_reply, language, response_ms, success, action_triggered, error, created_at', { count: 'exact' })
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (success !== undefined) query = query.eq('success', success === 'true');
    if (action) query = query.eq('action_triggered', action);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ logs: data, total: count, page: Number(page), limit: Number(limit) });
  } catch (err) { next(err); }
};

// ── Get daily message volume for chart ───────────────────────────────────────
export const getDailyVolume = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const days = parseInt(req.query.days || '30', 10);
    const from = new Date(Date.now() - days * 86400000).toISOString();

    const { data, error } = await supabase
      .from('chat_logs')
      .select('created_at, success')
      .eq('agent_id', agentId)
      .gte('created_at', from)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Group by date
    const grouped = {};
    for (const row of data || []) {
      const date = row.created_at.slice(0, 10);
      if (!grouped[date]) grouped[date] = { date, total: 0, success: 0, failed: 0 };
      grouped[date].total++;
      row.success ? grouped[date].success++ : grouped[date].failed++;
    }

    res.json(Object.values(grouped));
  } catch (err) { next(err); }
};
