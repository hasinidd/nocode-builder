import supabase from '../db/supabase.js';

export class AnalyticsAggregator {

  async getAgentSummary(agentId, startDate, endDate) {
    const { data: logs } = await supabase
      .from('chat_logs')
      .select('*')
      .eq('agent_id', agentId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (!logs || logs.length === 0) {
      return { totalMessages: 0, activeSessions: 0, avgLatencyMs: 0, estimatedTokens: 0, costUSD: 0 };
    }

    const totalMessages = logs.length;
    const uniqueSessions = new Set(logs.map(l => l.session_id)).size;
    const totalLatency = logs.reduce((acc, l) => acc + (l.response_ms || 0), 0);
    const avgLatencyMs = Math.round(totalLatency / totalMessages);

    let totalChars = 0;
    logs.forEach(l => {
      totalChars += (l.user_message?.length || 0) + (l.agent_reply?.length || 0);
    });

    const estimatedTokens = Math.ceil(totalChars / 4);
    const costUSD = (estimatedTokens / 1000) * 0.0015;

    return {
      totalMessages,
      activeSessions: uniqueSessions,
      avgLatencyMs,
      estimatedTokens,
      costUSD: Number(costUSD.toFixed(4)),
      languageBreakdown: this._calculateLanguageDistribution(logs),
      actionBreakdown: this._calculateActionCounts(logs)
    };
  }

  _calculateLanguageDistribution(logs) {
    const dist = {};
    logs.forEach(l => {
      const lang = l.language || 'en';
      dist[lang] = (dist[lang] || 0) + 1;
    });
    return dist;
  }

  _calculateActionCounts(logs) {
    const actions = { booking: 0, order: 0, lead: 0, none: 0 };
    logs.forEach(l => {
      const act = l.action_triggered || 'none';
      if (actions[act] !== undefined) actions[act]++;
      else actions.none++;
    });
    return actions;
  }

  scoreSentiment(text) {
    if (!text) return 0;
    const positive = ['great', 'good', 'awesome', 'thanks', 'thank you', 'helpful', 'love', 'perfect', 'excellent'];
    const negative = ['bad', 'horrible', 'wrong', 'useless', 'slow', 'hate', 'terrible', 'error', 'broken'];

    const lower = text.toLowerCase();
    let score = 0;

    positive.forEach(w => { if (lower.includes(w)) score += 0.25; });
    negative.forEach(w => { if (lower.includes(w)) score -= 0.25; });

    return Math.max(-1.0, Math.min(1.0, score));
  }
}

export const analyticsAggregator = new AnalyticsAggregator();
export default analyticsAggregator;
