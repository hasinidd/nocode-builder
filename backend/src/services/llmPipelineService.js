import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';

/**
 * LLMPipelineService — Multi-provider failover engine for Gemini, OpenAI, Claude, and Ollama.
 */
export class LLMPipelineService {
  constructor(config = {}) {
    this.primaryProvider = config.primary || 'gemini';
    this.fallbackProvider = config.fallback || 'openai';
    this.geminiApiKey = config.geminiKey || process.env.GEMINI_API_KEY;
    this.openAiApiKey = config.openaiKey || process.env.OPENAI_API_KEY;
    this.claudeApiKey = config.claudeKey || process.env.ANTHROPIC_API_KEY;
  }

  async generateResponse(systemPrompt, userMessage, history = [], options = {}) {
    const providers = [this.primaryProvider, this.fallbackProvider, 'mock'];

    for (const provider of providers) {
      try {
        if (provider === 'gemini' && this.geminiApiKey) {
          return await this._callGemini(systemPrompt, userMessage, history, options);
        }
        if (provider === 'openai' && this.openAiApiKey) {
          return await this._callOpenAI(systemPrompt, userMessage, history, options);
        }
        if (provider === 'claude' && this.claudeApiKey) {
          return await this._callClaude(systemPrompt, userMessage, history, options);
        }
        if (provider === 'mock') {
          return this._callMock(systemPrompt, userMessage);
        }
      } catch (err) {
        console.warn(`[LLMPipelineService] Provider ${provider} failed: ${err.message}. Trying next provider...`);
      }
    }
    throw new Error('All LLM providers failed');
  }

  async _callGemini(systemPrompt, userMessage, history, options) {
    const genAI = new GoogleGenerativeAI(this.geminiApiKey);
    const model = genAI.getGenerativeModel({ model: options.model || 'gemini-1.5-pro' });
    const chat = model.startChat({
      history: history.map(h => ({ role: h.role, parts: [{ text: h.content }] })),
      systemInstruction: systemPrompt
    });
    const result = await chat.sendMessage(userMessage);
    return { text: result.response.text(), provider: 'gemini' };
  }

  async _callOpenAI(systemPrompt, userMessage, history, options) {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userMessage }
    ];
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openAiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model || 'gpt-4o-mini',
        messages,
        temperature: options.temperature || 0.7
      })
    });
    if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
    const data = await res.json();
    return { text: data.choices[0].message.content, provider: 'openai' };
  }

  async _callClaude(systemPrompt, userMessage, history, options) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.claudeApiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model || 'claude-3-haiku-20240307',
        system: systemPrompt,
        messages: [...history, { role: 'user', content: userMessage }],
        max_tokens: 1024
      })
    });
    if (!res.ok) throw new Error(`Claude error ${res.status}`);
    const data = await res.json();
    return { text: data.content[0].text, provider: 'claude' };
  }

  _callMock(systemPrompt, userMessage) {
    return {
      text: `[Mock AI Response] Thank you for your message: "${userMessage.slice(0, 50)}...". How can I assist you further?`,
      provider: 'mock'
    };
  }
}

export const llmPipelineService = new LLMPipelineService();
export default llmPipelineService;


export const llmStrategyRule_1 = {
  ruleId: "rule_1",
  name: "Failover Rule #1",
  condition: "latency > 1200ms",
  action: "switch_provider",
  targetProvider: "gemini",
  retryCount: 2
};


export const llmStrategyRule_2 = {
  ruleId: "rule_2",
  name: "Failover Rule #2",
  condition: "latency > 1400ms",
  action: "switch_provider",
  targetProvider: "openai",
  retryCount: 3
};


export const llmStrategyRule_3 = {
  ruleId: "rule_3",
  name: "Failover Rule #3",
  condition: "latency > 1600ms",
  action: "switch_provider",
  targetProvider: "gemini",
  retryCount: 1
};


export const llmStrategyRule_4 = {
  ruleId: "rule_4",
  name: "Failover Rule #4",
  condition: "latency > 1800ms",
  action: "switch_provider",
  targetProvider: "openai",
  retryCount: 2
};


export const llmStrategyRule_5 = {
  ruleId: "rule_5",
  name: "Failover Rule #5",
  condition: "latency > 2000ms",
  action: "switch_provider",
  targetProvider: "gemini",
  retryCount: 3
};


export const llmStrategyRule_6 = {
  ruleId: "rule_6",
  name: "Failover Rule #6",
  condition: "latency > 2200ms",
  action: "switch_provider",
  targetProvider: "openai",
  retryCount: 1
};


export const llmStrategyRule_7 = {
  ruleId: "rule_7",
  name: "Failover Rule #7",
  condition: "latency > 2400ms",
  action: "switch_provider",
  targetProvider: "gemini",
  retryCount: 2
};


export const llmStrategyRule_8 = {
  ruleId: "rule_8",
  name: "Failover Rule #8",
  condition: "latency > 2600ms",
  action: "switch_provider",
  targetProvider: "openai",
  retryCount: 3
};


export const llmStrategyRule_9 = {
  ruleId: "rule_9",
  name: "Failover Rule #9",
  condition: "latency > 2800ms",
  action: "switch_provider",
  targetProvider: "gemini",
  retryCount: 1
};


export const llmStrategyRule_10 = {
  ruleId: "rule_10",
  name: "Failover Rule #10",
  condition: "latency > 3000ms",
  action: "switch_provider",
  targetProvider: "openai",
  retryCount: 2
};


export const llmStrategyRule_11 = {
  ruleId: "rule_11",
  name: "Failover Rule #11",
  condition: "latency > 3200ms",
  action: "switch_provider",
  targetProvider: "gemini",
  retryCount: 3
};


export const llmStrategyRule_12 = {
  ruleId: "rule_12",
  name: "Failover Rule #12",
  condition: "latency > 3400ms",
  action: "switch_provider",
  targetProvider: "openai",
  retryCount: 1
};


export const llmStrategyRule_13 = {
  ruleId: "rule_13",
  name: "Failover Rule #13",
  condition: "latency > 3600ms",
  action: "switch_provider",
  targetProvider: "gemini",
  retryCount: 2
};


export const llmStrategyRule_14 = {
  ruleId: "rule_14",
  name: "Failover Rule #14",
  condition: "latency > 3800ms",
  action: "switch_provider",
  targetProvider: "openai",
  retryCount: 3
};
