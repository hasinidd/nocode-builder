import supabase from '../db/supabase.js';

export class ClaimAgentService {
  async claimPendingAgent(claimToken, targetUserId) {
    const { data: pending, error } = await supabase
      .from('pending_agents')
      .select('*')
      .eq('claim_token', claimToken)
      .single();

    if (error || !pending) {
      throw new Error('Invalid or expired claim token');
    }

    const { data: agent } = await supabase
      .from('agents')
      .insert({
        user_id: targetUserId,
        name: pending.name,
        description: pending.description,
        system_prompt: pending.system_prompt,
        config: pending.config,
        published: false
      })
      .select()
      .single();

    await supabase.from('pending_agents').delete().eq('id', pending.id);

    return agent;
  }
}

export const claimAgentService = new ClaimAgentService();
export default claimAgentService;
