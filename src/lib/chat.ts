import { supabase } from "@/integrations/supabase/client";

type ContentPart = 
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type ChatMessage = { role: "user" | "assistant"; content: string | ContentPart[] };
type ChatMessageWithSystem = { role: "user" | "assistant" | "system"; content: string | ContentPart[] };

async function getAuthToken(): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) return data.session.access_token;
  } catch {}
  return import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
}

export interface ActionResult {
  name: string;
  success: boolean;
  message: string;
  documentLink?: { label: string; url: string };
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export function buildUserMessage(text: string, imageUrls?: string[]): ChatMessage {
  if (!imageUrls || imageUrls.length === 0) {
    return { role: "user", content: text };
  }
  const parts: ContentPart[] = [];
  imageUrls.forEach(url => parts.push({ type: "image_url", image_url: { url } }));
  if (text) parts.push({ type: "text", text });
  return { role: "user", content: parts };
}

export interface SequenceItem {
  item_type: "text" | "image" | "video" | "audio" | "file";
  content: string | null;
  media_url: string | null;
  file_name: string | null;
  sort_order: number;
}

export async function streamChat({
  messages,
  agentId,
  conversationId,
  authToken,
  onDelta,
  onDone,
  onError,
  onActionResults,
  onSequenceItems,
}: {
  messages: (ChatMessage | ChatMessageWithSystem)[];
  agentId: string;
  conversationId?: string;
  authToken?: string;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
  onActionResults?: (results: ActionResult[]) => void;
  onSequenceItems?: (items: SequenceItem[]) => void;
}) {
  try {
    const token = authToken || await getAuthToken();
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ messages, agentId, conversationId }),
    });

    if (resp.status === 429) { onError("Rate limit exceeded. Please try again in a moment."); return; }
    if (resp.status === 402) { onError("AI credits exhausted. Please add funds to continue."); return; }
    if (resp.status === 403) {
      let message = "Preview access expired. Please refresh and try again.";
      try {
        const data = await resp.json();
        if (data?.error === "Agent is not active") {
          message = "This preview is still in setup mode. Please refresh and try again.";
        } else if (typeof data?.error === "string" && data.error.trim()) {
          message = data.error;
        }
      } catch {}
      onError(message);
      return;
    }
    if (!resp.ok || !resp.body) {
      let message = "Failed to connect to AI. Please try again.";
      try {
        const data = await resp.json();
        if (typeof data?.error === "string" && data.error.trim()) message = data.error;
      } catch {}
      onError(message);
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") { streamDone = true; break; }

        try {
          const parsed = JSON.parse(jsonStr);

          if (parsed.action_results && onActionResults) {
            onActionResults(parsed.action_results);
          }
          if (parsed.sequence_items && onSequenceItems) {
            onSequenceItems(parsed.sequence_items);
          }

          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.action_results && onActionResults) onActionResults(parsed.action_results);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch { /* ignore */ }
      }
    }

    onDone();
  } catch (e) {
    onError(e instanceof Error ? e.message : "Unknown error");
  }
}

/** Non-streaming send that collects the full response text — used by voice calls */
export async function sendChatCollect({
  messages,
  agentId,
  authToken,
}: {
  messages: (ChatMessage | ChatMessageWithSystem)[];
  agentId: string;
  authToken?: string;
}): Promise<{ text: string; actionResults: ActionResult[] }> {
  const token = authToken || await getAuthToken();
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages, agentId }),
  });

  if (!resp.ok || !resp.body) throw new Error("Failed to connect to AI");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "", full = "";
  const actionResults: ActionResult[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const js = line.slice(6).trim();
      if (js === "[DONE]") break;
      try {
        const p = JSON.parse(js);
        if (p.action_results) actionResults.push(...p.action_results);
        const c = p.choices?.[0]?.delta?.content;
        if (c) full += c;
      } catch {}
    }
  }
  return { text: full, actionResults };
}
