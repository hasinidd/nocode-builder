import { chatWithAgent, detectLanguage } from '../services/geminiService.js';
import supabase from '../db/supabase.js';

// ── Send a chat message to a published agent ──────────────────────────────────
export const sendMessage = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const { message, sessionId, history = [] } = req.body;

    if (!message?.trim()) return res.status(400).json({ error: 'Message cannot be empty' });

    // Fetch agent config
    const { data: agent, error: agentErr } = await supabase
      .from('agents').select('*').eq('id', agentId).eq('published', true).single();
    if (agentErr || !agent) return res.status(404).json({ error: 'Agent not found or not published' });

    // Detect language if auto-detect enabled
    let lang = agent.language;
    if (agent.config?.autoDetectLanguage) {
      lang = await detectLanguage(message) || lang;
    }

    // Fetch relevant knowledge base context
    const { data: kbChunks } = await supabase
      .from('knowledge_base')
      .select('content')
      .eq('agent_id', agentId)
      .limit(5);

    const context = kbChunks?.map(c => c.content).join('\n\n') || '';

    const startTime = Date.now();
    const reply = await chatWithAgent(agent, message, history, context, lang);
    const responseMs = Date.now() - startTime;

    // Classify whether booking/order/lead action was triggered
    const actionTriggered = detectAction(reply);

    // Log interaction
    await supabase.from('chat_logs').insert({
      agent_id: agentId,
      session_id: sessionId,
      user_message: message,
      agent_reply: reply,
      language: lang,
      response_ms: responseMs,
      action_triggered: actionTriggered,
      success: true
    });

    res.json({ reply, language: lang, action: actionTriggered, responseMs });
  } catch (err) {
    // Log failure
    const { agentId } = req.params;
    await supabase.from('chat_logs').insert({
      agent_id: agentId,
      session_id: req.body.sessionId,
      user_message: req.body.message,
      success: false,
      error: err.message
    }).catch(() => {});
    next(err);
  }
};

// ── Get chat history for a session ────────────────────────────────────────────
export const getHistory = async (req, res, next) => {
  try {
    const { agentId, sessionId } = req.params;
    const { data, error } = await supabase
      .from('chat_logs')
      .select('user_message, agent_reply, language, created_at, action_triggered')
      .eq('agent_id', agentId)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};

// ── Detect if the agent reply contains an action trigger ──────────────────────
function detectAction(reply) {
  const lower = reply.toLowerCase();
  if (lower.includes('book') || lower.includes('appointment') || lower.includes('slot')) return 'booking';
  if (lower.includes('order') || lower.includes('purchase') || lower.includes('buy')) return 'order';
  if (lower.includes('your name') || lower.includes('your email') || lower.includes('contact')) return 'lead';
  return null;
}
