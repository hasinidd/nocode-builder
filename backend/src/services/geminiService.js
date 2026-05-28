import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const LANGUAGE_NAMES = { en: 'English', si: 'Sinhala', ta: 'Tamil', fr: 'French', de: 'German', es: 'Spanish', ja: 'Japanese', zh: 'Chinese' };

// ── Generate full agent config from description ───────────────────────────────
export const generateAgentConfig = async ({ name, description, language = 'en', tone = 'professional', features = [] }) => {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

  const prompt = `You are an AI agent configuration generator for a no-code platform.
Given the following agent details, generate a complete configuration object.

Agent Name: ${name}
Description: ${description}
Preferred Language: ${LANGUAGE_NAMES[language] || language}
Tone: ${tone}
Required Features: ${features.join(', ') || 'general chat'}

Generate a JSON object with this exact shape:
{
  "systemPrompt": "A detailed system prompt for this agent",
  "welcomeMessage": "A friendly opening message to greet users",
  "features": ["list", "of", "capabilities"],
  "capabilities": ["booking" | "orders" | "leads" | "scraping" | "ocr"],
  "autoDetectLanguage": true,
  "fallbackLanguage": "${language}",
  "tone": "${tone}",
  "maxContextLength": 10,
  "confirmationMessages": { "booking": "...", "order": "...", "lead": "..." }
}
Return ONLY valid JSON, no markdown.`;

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(raw);
  } catch {
    return {
      systemPrompt: `You are ${name}. ${description}. Be ${tone}.`,
      welcomeMessage: `Hi! I'm ${name}. How can I help you today?`,
      features,
      capabilities: [],
      autoDetectLanguage: true,
      fallbackLanguage: language,
      tone
    };
  }
};

// ── Rebuild system prompt after settings change ───────────────────────────────
export const rebuildSystemPrompt = async (agent) => {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const prompt = `Update this AI agent's system prompt based on the new settings:
Name: ${agent.name}
Description: ${agent.description}
Tone: ${agent.tone}
Language: ${agent.language}
Features: ${(agent.features || []).join(', ')}
Return only the system prompt text, no JSON wrapper.`;
  const result = await model.generateContent(prompt);
  return result.response.text();
};

// ── Chat with an agent ────────────────────────────────────────────────────────
export const chatWithAgent = async (agent, userMessage, history = [], context = '', lang = 'en') => {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

  const systemInstruction = [
    agent.system_prompt,
    context ? `\n\nKnowledge Base Context:\n${context}` : '',
    lang !== 'en' ? `\n\nRespond in ${LANGUAGE_NAMES[lang] || lang}.` : ''
  ].filter(Boolean).join('');

  const chat = model.startChat({
    history: history.map(h => ({
      role: h.role,
      parts: [{ text: h.content }]
    })),
    systemInstruction
  });

  const result = await chat.sendMessage(userMessage);
  return result.response.text();
};

// ── Detect language from text ─────────────────────────────────────────────────
export const detectLanguage = async (text) => {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const prompt = `Detect the language of the following text and return only the ISO 639-1 language code (e.g., "en", "si", "ta", "fr").
Text: "${text.slice(0, 200)}"
Return only the code.`;
  try {
    const result = await model.generateContent(prompt);
    const code = result.response.text().trim().toLowerCase().slice(0, 2);
    return LANGUAGE_NAMES[code] ? code : 'en';
  } catch { return 'en'; }
};
