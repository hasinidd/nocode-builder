import supabase from '../db/supabase.js';

export const getLeads = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('inquiries').select('*').eq('agent_id', req.params.agentId).order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};

export const submitLead = async (req, res, next) => {
  try {
    const { agentId, fields, sessionId } = req.body;
    const { data, error } = await supabase
      .from('inquiries').insert({ agent_id: agentId, fields, session_id: sessionId }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
};

export const deleteLead = async (req, res, next) => {
  try {
    const { error } = await supabase.from('inquiries').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (err) { next(err); }
};
