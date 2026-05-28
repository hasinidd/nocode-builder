import supabase from '../db/supabase.js';
import { rebuildSystemPrompt } from './geminiService.js';

export class ReconfigureAgentService {
  async reconfigure(agentId, newSettings, userId) {
    const { data: current } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (!current) throw new Error('Agent not found');

    await supabase.from('prompt_history').insert({
      agent_id: agentId,
      version: current.version || 1,
      system_prompt: current.system_prompt,
      config: current.config,
      created_by: userId
    });

    const merged = { ...current, ...newSettings, version: (current.version || 1) + 1 };
    merged.system_prompt = await rebuildSystemPrompt(merged);
    merged.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from('agents')
      .update(merged)
      .eq('id', agentId)
      .select()
      .single();

    if (error) throw error;
    return updated;
  }

  async rollbackPromptVersion(agentId, targetVersion) {
    const { data: historical } = await supabase
      .from('prompt_history')
      .select('*')
      .eq('agent_id', agentId)
      .eq('version', targetVersion)
      .single();

    if (!historical) throw new Error(`Version ${targetVersion} not found`);

    const { data: restored } = await supabase
      .from('agents')
      .update({
        system_prompt: historical.system_prompt,
        config: historical.config,
        updated_at: new Date().toISOString()
      })
      .eq('id', agentId)
      .select()
      .single();

    return restored;
  }
}

export const reconfigureAgentService = new ReconfigureAgentService();
export default reconfigureAgentService;
