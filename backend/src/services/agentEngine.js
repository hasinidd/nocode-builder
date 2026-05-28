import { chatWithAgent } from './geminiService.js';
import { embeddingService } from './embeddingService.js';
import supabase from '../db/supabase.js';

export class AgentEngine {
  constructor(options = {}) {
    this.maxContextTokens = options.maxContextTokens || 4096;
    this.defaultTemperature = options.temperature || 0.7;
  }

  async processTurn({ agentId, sessionId, userMessage, conversationHistory = [] }) {
    const turnStart = Date.now();

    const { data: agent, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (error || !agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const relevantChunks = await embeddingService.searchKnowledgeBase(agentId, userMessage, 4, 0.5);
    const ragContext = relevantChunks.map(c => c.content).join('\n\n');

    const systemPrompt = this._buildSystemPrompt(agent, ragContext);
    const trimmedHistory = this._trimHistory(conversationHistory, 10);

    const replyText = await chatWithAgent(agent, userMessage, trimmedHistory, ragContext, agent.language);

    const actionResult = await this._evaluateActions(agent, replyText, userMessage, sessionId);
    const responseMs = Date.now() - turnStart;

    await this._logTurn({
      agentId,
      sessionId,
      userMessage,
      agentReply: replyText,
      language: agent.language,
      responseMs,
      action: actionResult?.type || null
    });

    return {
      reply: replyText,
      agentId,
      sessionId,
      language: agent.language,
      ragSources: relevantChunks.map(c => ({ url: c.source_url, file: c.source_file })),
      action: actionResult,
      responseMs
    };
  }

  _buildSystemPrompt(agent, ragContext) {
    const parts = [
      agent.system_prompt || `You are ${agent.name}, an AI assistant.`,
      `Tone: ${agent.tone || 'professional'}`,
      `Language: ${agent.language || 'en'}`
    ];

    if (agent.features && agent.features.length > 0) {
      parts.push(`Capabilities enabled: ${agent.features.join(', ')}`);
    }

    if (ragContext) {
      parts.push(`\n--- KNOWLEDGE BASE CONTEXT ---\n${ragContext}\n------------------------------`);
    }

    return parts.join('\n');
  }

  _trimHistory(history, maxTurns = 10) {
    if (!Array.isArray(history)) return [];
    return history.slice(-maxTurns * 2);
  }

  async _evaluateActions(agent, replyText, userMessage, sessionId) {
    const lower = (userMessage + ' ' + replyText).toLowerCase();
    if (lower.includes('book') || lower.includes('appointment')) {
      return { type: 'booking', trigger: 'keyword' };
    }
    if (lower.includes('order') || lower.includes('buy') || lower.includes('product')) {
      return { type: 'order', trigger: 'keyword' };
    }
    if (lower.includes('name') && lower.includes('email')) {
      return { type: 'lead', trigger: 'keyword' };
    }
    return null;
  }

  async _logTurn({ agentId, sessionId, userMessage, agentReply, language, responseMs, action }) {
    try {
      await supabase.from('chat_logs').insert({
        agent_id: agentId,
        session_id: sessionId,
        user_message: userMessage,
        agent_reply: agentReply,
        language,
        response_ms: responseMs,
        action_triggered: action,
        success: true
      });
    } catch (err) {
      console.error('[AgentEngine] Turn logging error:', err.message);
    }
  }
}

export const agentEngine = new AgentEngine();
export default agentEngine;
