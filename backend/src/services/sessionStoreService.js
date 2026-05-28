import supabase from '../db/supabase.js';

export class SessionStoreService {
  async getSession(sessionId) {
    const { data } = await supabase.from('chat_sessions').select('*').eq('id', sessionId).single();
    return data;
  }

  async createSession(agentId, userId = null) {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const { data } = await supabase.from('chat_sessions').insert({ id: sessionId, agent_id: agentId, user_id: userId }).select().single();
    return data || { id: sessionId, agent_id: agentId };
  }
}

export const sessionStoreService = new SessionStoreService();
export default sessionStoreService;
