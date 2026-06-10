import { useState, useRef, useEffect, useCallback, useMemo, useImperativeHandle, forwardRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Sparkles, CheckCircle2, User, FileText, Upload, Loader2, X, Globe, Link as LinkIcon, Mic, Image as ImageIcon, Paperclip } from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import VoiceButton from "@/components/VoiceButton";
import VoiceModeToggle from "@/components/VoiceModeToggle";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { extractDocumentText, isSupportedDocument } from "@/lib/documentExtract";
import { scrapeWebsite } from "@/lib/firecrawl";
import InteractiveChatMessage from "@/components/InteractiveChatMessage";
import type { AgentType, AgentPersonality } from "@/types/agent";
import { buildConfiguratorConversation, buildConfiguratorSeedMessage, buildImportedWebsiteMessage, type ConfiguratorMessage } from "@/lib/configuratorContext";
import shopifyLogo from "@/assets/shopify-logo.png";
import woocommerceLogo from "@/assets/woocommerce-logo.png";

type Msg = ConfiguratorMessage;

export interface ExtractedConfig {
  name?: string;
  agentType?: AgentType;
  personality?: AgentPersonality;
  defaultLanguage?: string;
  systemPrompt?: string;
  welcomeMessage?: string;
  knowledgeBase?: string;
  welcomeSequence?: Array<{
    type: "text" | "image" | "video" | "audio" | "file";
    content: string;
  }>;
  capabilities?: string[];
  businessHours?: string;
  faqs?: Array<{ question: string; answer: string }>;
  rules?: string[];
  contactInfo?: string;
}

export interface ConfiguratorChatHandle {
  requestFinalize: () => void;
}

interface Props {
  initialName: string;
  initialType: AgentType;
  initialDescription: string;
  scrapedContent?: string;
  scrapedTitle?: string;
  uploadedDocContent?: string;
  uploadedDocName?: string;
  onConfigReady: (config: ExtractedConfig) => void;
  onSummaryUpdate?: (summary: string) => void;
  agentId?: string;
}

const ACTION_MARKERS = [
  "ADD_PRODUCT", "ADD_SERVICE", "UPDATE_AGENT", "DELETE_PRODUCT", "DELETE_SERVICE",
  "ADD_CAPABILITY", "ADD_RULE", "ADD_FAQ", "UPDATE_BUSINESS", "SCRAPE_URL",
  "ADD_DOCUMENT_TEMPLATE", "DELETE_DOCUMENT_TEMPLATE"
];

function stripErrorResults(text: string): string {
  return text
    .split("\n")
    .filter(line => !line.trim().startsWith("❌"))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripAllMarkers(text: string): string {
  let cleaned = text.split("[CONFIG_READY]")[0].trim();
  ACTION_MARKERS.forEach(m => {
    cleaned = cleaned.replace(new RegExp(`\\[${m}\\][\\s\\S]*?\\[/${m}\\]`, "g"), "");
  });
  cleaned = cleaned.replace(/\[(?:ADD_PRODUCT|ADD_SERVICE|UPDATE_AGENT|DELETE_PRODUCT|DELETE_SERVICE|ADD_CAPABILITY|ADD_RULE|ADD_FAQ|UPDATE_BUSINESS|SCRAPE_URL|ADD_DOCUMENT_TEMPLATE|DELETE_DOCUMENT_TEMPLATE)\][\s\S]*?\[\/(?:ADD_PRODUCT|ADD_SERVICE|UPDATE_AGENT|DELETE_PRODUCT|DELETE_SERVICE|ADD_CAPABILITY|ADD_RULE|ADD_FAQ|UPDATE_BUSINESS|SCRAPE_URL|ADD_DOCUMENT_TEMPLATE|DELETE_DOCUMENT_TEMPLATE)\]/g, "");
  cleaned = cleaned.replace(/\[(?:ADD_PRODUCT|ADD_SERVICE|UPDATE_AGENT|DELETE_PRODUCT|DELETE_SERVICE|ADD_CAPABILITY|ADD_RULE|ADD_FAQ|UPDATE_BUSINESS|SCRAPE_URL|ADD_DOCUMENT_TEMPLATE|DELETE_DOCUMENT_TEMPLATE)\]\s*\{[^}]*\}/g, "");
  cleaned = cleaned.replace(/\[\/?(?:ADD_PRODUCT|ADD_SERVICE|UPDATE_AGENT|DELETE_PRODUCT|DELETE_SERVICE|ADD_CAPABILITY|ADD_RULE|ADD_FAQ|UPDATE_BUSINESS|SCRAPE_URL|ADD_DOCUMENT_TEMPLATE|DELETE_DOCUMENT_TEMPLATE)\]/g, "");
  cleaned = cleaned.replace(/\[SUMMARY\][\s\S]*?\[\/SUMMARY\]/g, "");
  cleaned = cleaned.replace(/```json[\s\S]*?```/g, "");
  cleaned = cleaned.replace(/^\s*\{[\s\S]*?\}\s*$/gm, "");
  cleaned = cleaned.replace(/^\s*\*{0,2}(?:Agent\s*Name|Type|Agent\s*Type|Tone|Personality|Purpose|Language|Welcome\s*Message|Currency|Status|Business\s*Hours|Contact\s*Info|Services|Products|FAQs|Rules)\s*:?\*{0,2}.*$/gim, "");
  cleaned = cleaned.replace(/^\s*.+\((?:[^\n)]*(?:min|LKR|USD|EUR|GBP|\$|€|£)[^\n)]*)\)\s*$/gm, "");
  cleaned = cleaned
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      if (/^(?:[-•]\s*)?(?:Agent\s*Name|Type|Agent\s*Type|Tone|Personality|Purpose|Language|Welcome\s*Message|Currency|Status|Business\s*Hours|Contact\s*Info|Services|Products|FAQs|Rules)\s*:/i.test(trimmed)) return false;
      if (/\((?:[^\n)]*(?:min|LKR|USD|EUR|GBP|\$|€|£)[^\n)]*)\)$/.test(trimmed)) return false;
      return true;
    })
    .join("\n");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  return cleaned.trim();
}

const CONFIGURATOR_SYSTEM_PROMPT = `You are BuildStart's friendly configuration assistant. Your job is to help non-technical users set up their AI agent through a guided, interactive conversation.

The user has already provided some initial info. Your goal is to gather enough details to build a great agent for them.

## CRITICAL RULE: KEEP RESPONSES SHORT AND CONCISE

Your responses MUST be brief — 2-4 sentences max per message. Do NOT write long paragraphs or lengthy explanations. Ask ONE question at a time. Get to the point quickly. Users want speed, not essays.

## CRITICAL RULE: EVERY MESSAGE MUST END WITH A QUESTION

Your EVERY response MUST end with a question to the user. Never leave a message without asking what to do next. This includes after action confirmations, after showing summaries, after errors — ALWAYS end with a question or button choices. The user must never feel like the setup is complete until YOU explicitly say so with [CONFIG_READY].

## INTERACTIVE UI FORMAT

You MUST use these special markers to create interactive, structured responses instead of plain text walls:

### Quick-Select Buttons
When offering choices, ALWAYS use buttons. NEVER use emojis inside button text — keep it clean and simple:
[BUTTONS: Option A | Option B | Option C]

### Configuration Summary
When showing what's been configured, wrap it in a summary card:
[SUMMARY]
**Agent Name:** My Bot
**Type:** Support Bot
**Tone:** Friendly
**Language:** English
[/SUMMARY]

## RESPONSE STYLE RULES

1. **Keep messages VERY short** — 2-4 sentences max. NO long paragraphs. NO walls of text. Be punchy and direct.
2. **ALWAYS offer button choices** when possible — yes/no, tone selection, feature toggles, etc.
3. **NEVER use emojis in button text** — keep button labels clean (e.g. "Professional" not "🏢 Professional")
4. **One question per message** — keep it focused
5. **NEVER repeat configured data in your chat text** — no "Agent Name: X, Type: Y, Tone: Z" lines in the message body. Configuration data belongs ONLY inside [SUMMARY] blocks which display in the phone preview. Your chat message should ONLY contain conversational text and questions.
6. **Do NOT wrap questions in [STEP] markers** — just ask the question directly as plain text
7. **NEVER show raw JSON, system markers, or config syntax to the user** — all output must be natural language
8. **ALWAYS end with a question** — never leave the user without a next step. After confirming actions, immediately ask the next configuration question.
9. **After confirming a setting, just acknowledge it briefly** — e.g. "Got it!" or "Done!" then move to the next question. Do NOT echo back all the configured fields.
10. **When listing items found from documents/websites** — show max 5-6 items in a concise list. Do NOT list every single item. Say "...and X more" for the rest.

## AGENT TYPE LOCK (CRITICAL — ABSOLUTE RULE)

The user has ALREADY selected their agent type before reaching you. **YOU MUST NEVER CHANGE IT.** This is locked and non-negotiable.

- If agentType is "order_handler" → This is a PRODUCT-based business. Use ADD_PRODUCT markers ONLY. NEVER mention services or use ADD_SERVICE. Products are physical/digital items that customers BUY.
- If agentType is "booking_agent" → This is a SERVICE-based business. Use ADD_SERVICE markers ONLY. NEVER mention products or use ADD_PRODUCT. Services are things with TIME/DURATION that customers BOOK.
- If agentType is "inquiry_only" → This is an FAQ/lead-collection business. Do NOT add products or services. Focus on knowledge base, FAQs, and collect fields.

**NEVER suggest changing the agent type. NEVER refer to "products" in a booking agent or "services" in an order handler. Even if the user's description sounds ambiguous, the type is LOCKED.**

### PRODUCT vs SERVICE — STRICT RULES:
- **PRODUCTS** (order_handler ONLY) = Tangible items or digital goods with a PRICE but NO duration. Examples: clothing, food items, electronics, beauty products, accessories, books, furniture.
  → Use ADD_PRODUCT. Fields: name, price, currency, description, category, variants
- **SERVICES** (booking_agent ONLY) = Activities/appointments with a DURATION and a price. Examples: haircut (45 min), consultation (1 hour), massage (60 min), lesson (30 min).
  → Use ADD_SERVICE. Fields: name, price, currency, duration_minutes, description, category, variants

NEVER mix these up. The agent type determines which one to use — period.

## CONVERSATION FLOW

Guide users through these steps one at a time. Ask the question directly — do NOT use step labels or headers:
1. Purpose & capabilities — what should the agent do?
2. Tone & personality — how should it talk?
3. Response Language — Ask: "What language should your bot reply in?"
   - **Auto-detect** — Bot detects user's language and replies accordingly
   - **Single language** — Pick one specific language
   - **Multiple languages** — Let the user pick 2-3 languages
   
   Clarify: "This is the language your bot will use to respond to customers, not the language you're using now."
   IMPORTANT: Do NOT translate the welcome message yourself. Just store it in the language the user types it in. If the user types a welcome message in English, store it as English. Only translate if the user explicitly asks you to translate it.
4. Welcome message — what should it say first?
5. Welcome Sequence — "Would you also like to add images, videos, or audio to your welcome?"
   - Offer: [BUTTONS: Text only | Add images | Add video | Add audio | Skip for now]
6. Business details — hours, pricing, services, contact
7. FAQs — common questions and answers
8. Rules — what it should/shouldn't do

## EXAMPLE RESPONSES

**Good (clean buttons):**
"How should your agent communicate with customers?

[BUTTONS: Professional | Friendly | Casual]"

**Language step example:**
"What language should your bot reply to customers in?

[BUTTONS: Auto-detect | English | Spanish | Other language | Multiple languages]"

**Bad:**
"[STEP: 🎯 Agent Purpose] What should this agent help with? [/STEP]"

After gathering enough info (usually 5-7 exchanges), show a [SUMMARY] (it will appear in the phone preview only, NOT in chat) and ask for confirmation with [BUTTONS: Looks good, finish! | I want to change something].

CRITICAL: The [SUMMARY] block is rendered ONLY in the phone preview sidebar. It is NEVER visible in the chat. So your chat text must NOT duplicate config data. Just write conversational text + questions in the chat body.

## DOCUMENT & IMAGE ANALYSIS

When the user uploads a document (PDF, CSV, TXT) or an image (photo of a menu, catalog, price list, business card, etc.):

1. **Carefully analyze ALL content** — extract every product, service, price, business detail, contact info, FAQ, policy
2. **Present a structured summary** of what you found
3. **Ask the user to confirm** before adding items:
   "I found the following from your document:
   
   **Products (5 items):**
   - Product A: $10.00
   - Product B: $15.00
   
   **Business Details:**
   - Hours: Mon-Fri 9-5
   - Phone: 123-456-7890
   
   [BUTTONS: Add all items | Let me review first | Skip]"

4. **After confirmation, use action markers** to add each item directly to the database

## CHAT EXPORT ANALYSIS (ADVANCED)

When the user uploads exported chat logs (WhatsApp exports, customer support transcripts, chat history files, etc.):

1. **Identify it as a chat export** — look for patterns like timestamps, sender names, message format (e.g., "[12/01/2024, 10:30:15] John: Hello")
2. **Analyze the conversations deeply** to extract:
   - **Frequently asked questions** — identify recurring questions customers ask
   - **Best answers** — extract the most helpful responses given to those questions
   - **Common topics/intents** — categorize the types of inquiries (pricing, availability, support, complaints, etc.)
   - **Business policies** — any rules or policies mentioned in responses
   - **Business details** — hours, contact info, pricing mentioned in conversations
3. **Generate a comprehensive FAQ list** from the patterns found. For each FAQ:
   - Rephrase the question to be clear and generic (not tied to a specific customer)
   - Craft a polished, professional answer based on the responses found in the chats
   - Aim for 5-20 FAQs depending on the richness of the chat data
4. **Present the extracted FAQs** to the user for review:
   "I analyzed your chat history and extracted these frequently asked questions:
   
   **FAQs Found (8 items):**
   1. Q: What are your business hours? — A: We're open Mon-Fri 9am-6pm
   2. Q: Do you offer delivery? — A: Yes, we deliver within 10km radius
   ...
   
   [BUTTONS: Add all FAQs | Let me review first | Skip FAQs]"
   
5. **After confirmation, use [ADD_FAQ] markers** for EACH FAQ individually:
   [ADD_FAQ]{"question":"What are your business hours?","answer":"We are open Monday to Friday from 9am to 6pm."}[/ADD_FAQ]
   
6. **Also extract any products, services, or business info** found in the chats and offer to add those too using the appropriate markers.

## MANAGEMENT ACTIONS

You also have the ability to directly add products, services, and document templates to the agent. Use these action markers:

1. ADD A PRODUCT:
[ADD_PRODUCT]{"name":"Product Name","price":9.99,"currency":"USD","description":"Description","category":"Category","variants":[],"metadata":{}}[/ADD_PRODUCT]

2. ADD A SERVICE:
[ADD_SERVICE]{"name":"Service Name","price":29.99,"currency":"USD","duration_minutes":30,"description":"Description","category":"Category","variants":[],"metadata":{}}[/ADD_SERVICE]

IMPORTANT — CUSTOM/NON-STANDARD FIELDS:
- For ANY attribute the user mentions that doesn't fit the standard fields above, include them in the "metadata" object.
- NEVER refuse to add a custom attribute. Always store it in metadata.

3. UPDATE AGENT SETTINGS:
[UPDATE_AGENT]{"name":"New Name","welcome_message":"New welcome","personality":"friendly","default_currency":"USD"}[/UPDATE_AGENT]

4. DELETE: [DELETE_PRODUCT]{"id":"uuid"}[/DELETE_PRODUCT] or [DELETE_SERVICE]{"id":"uuid"}[/DELETE_SERVICE]

5. DOCUMENT TEMPLATES:
[ADD_DOCUMENT_TEMPLATE]{"name":"Standard Invoice","template_type":"invoice","description":"Default invoice template","business_info":{"company_name":"My Business"},"content_sections":[{"id":"terms","title":"Terms & Conditions","default_content":"Payment due within 30 days."}],"styling":{"primary_color":"#6366f1"}}[/ADD_DOCUMENT_TEMPLATE]
[DELETE_DOCUMENT_TEMPLATE]{"id":"uuid"}[/DELETE_DOCUMENT_TEMPLATE]

6. META UPDATES:
[ADD_CAPABILITY]{"capability":"text"}[/ADD_CAPABILITY]
[ADD_RULE]{"rule":"text"}[/ADD_RULE]
[ADD_FAQ]{"question":"Q","answer":"A"}[/ADD_FAQ]
[UPDATE_BUSINESS]{"businessHours":"Mon-Fri 9-5","contactInfo":"email@example.com"}[/UPDATE_BUSINESS]

7. SCRAPE: [SCRAPE_URL]{"url":"https://example.com"}[/SCRAPE_URL]

GUIDELINES FOR ACTIONS:
- For variants: [{"name":"Color","options":[{"value":"Red","price_modifier":0}]}]
- Confirm before actions with buttons
- After including action markers, do NOT predict or show execution results. The system will execute them and append real results automatically. Just say something like "Applying changes now..." AFTER the markers.
- NEVER output fake result summaries — the system handles that.
- Use the current agent state provided below to be aware of existing products/services
- When users provide product/service data (from documents, websites, or conversation), offer to add them directly

When the user confirms the overall configuration, end your message with exactly this marker on its own line:
[CONFIG_READY]

Then provide a JSON block with the COMPLETE extracted configuration:
\`\`\`json
{
  "name": "Suggested agent name",
  "agentType": "one of: booking_agent, order_handler, inquiry_only (MUST match what the user selected)",
  "personality": "one of: professional, friendly, casual",
  "defaultLanguage": "auto OR specific language like English, Spanish, Sinhala, etc.",
  "systemPrompt": "Complete system prompt with ALL instructions, knowledge, rules, tone, capabilities, business info, FAQs. MUST include language instruction based on user's choice.",
  "welcomeMessage": "The first greeting text message (in the chosen language)",
  "knowledgeBase": "All business facts, pricing, hours, policies, services — structured clearly",
  "welcomeSequence": [{ "type": "text", "content": "Welcome message" }],
  "capabilities": ["capability1", "capability2"],
  "businessHours": "hours if discussed",
  "availability": [
    { "day_of_week": 1, "start_time": "09:00", "end_time": "17:00", "is_available": true },
    { "day_of_week": 2, "start_time": "09:00", "end_time": "17:00", "is_available": true }
  ],
  "slotDurationMinutes": 30,
  "faqs": [{ "question": "Q", "answer": "A" }],
  "rules": ["rule1", "rule2"],
  "contactInfo": "contact info if provided"
}

IMPORTANT for availability:
- day_of_week: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
- ALWAYS include ALL 7 days (0-6). Set is_available=false for closed days.
- Use 24-hour format for times (e.g. "09:00", "17:00", "22:00")
- Parse the user's business hours into this structured format.
- If slotDurationMinutes is discussed (for booking agents), include it. Default 30.
\`\`\`

IMPORTANT: Extract as much structured data as possible from the conversation.
IMPORTANT: If the user asks to change ANY setting after initial config, output an updated [CONFIG_READY] block with the full updated config.
IMPORTANT: The "defaultLanguage" field should be "auto" if user chose auto-detect, or the specific language name otherwise.`;

const STORAGE_KEY_PREFIX = "configurator_chat_";

const ConfiguratorChat = forwardRef<ConfiguratorChatHandle, Props>(function ConfiguratorChat({ initialName, initialType, initialDescription, scrapedContent, scrapedTitle, uploadedDocContent, uploadedDocName, onConfigReady, onSummaryUpdate, agentId }, ref) {
  const storageKey = agentId ? `${STORAGE_KEY_PREFIX}${agentId}` : null;
  const seedMessage = useMemo(() => buildConfiguratorSeedMessage({
    initialName,
    initialType,
    initialDescription,
    scrapedContent,
    scrapedTitle,
    uploadedDocContent,
    uploadedDocName,
  }), [initialDescription, initialName, initialType, scrapedContent, scrapedTitle, uploadedDocContent, uploadedDocName]);

  const [messages, setMessages] = useState<Msg[]>(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved) as Msg[];
          // Strip error results (❌ lines) from restored messages
          return parsed.map(m => m.role === "assistant"
            ? { ...m, content: stripErrorResults(m.content) }
            : m
          ).filter(m => m.content.trim() !== "");
        }
      } catch {}
    }
    return [];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const sendVoiceRef = useRef<(text: string) => void>(() => {});
  const { isRecording, isTranscribing, toggleRecording } = useVoiceInput({
    onTranscript: (text) => sendVoiceRef.current(text),
    disabled: isLoading,
  });
  const { voiceMode, toggleVoiceMode, speak, isSpeaking } = useTextToSpeech();
  const [configExtracted, setConfigExtracted] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [showUrlDialog, setShowUrlDialog] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [isScrapingUrl, setIsScrapingUrl] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<{ type: "image" | "file"; url: string; name: string; extractedText?: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);
  const { user } = useAuth();

  // Shopify connection state
  const [showShopifyDialog, setShowShopifyDialog] = useState(false);
  const [shopifyDomain, setShopifyDomain] = useState("");
  const [shopifyLoading, setShopifyLoading] = useState(false);

  // WooCommerce connection state
  const [showWooDialog, setShowWooDialog] = useState(false);
  const [wooStoreUrl, setWooStoreUrl] = useState("");
  const [wooLoading, setWooLoading] = useState(false);

  const connectShopify = async () => {
    if (!shopifyDomain.trim() || !agentId || !user) return;
    setShopifyLoading(true);
    try {
      let cleanDomain = shopifyDomain.replace(/\/+$/, "").replace(/^https?:\/\//, "").trim();
      if (!cleanDomain.includes(".myshopify.com")) cleanDomain = `${cleanDomain}.myshopify.com`;

      const { data, error } = await supabase.functions.invoke("shopify-auth-url", {
        body: { shop: cleanDomain, agent_id: agentId, user_id: user.id, redirect_origin: window.location.origin },
      });
      if (error || !data?.auth_url) throw new Error("Failed to get Shopify authorization URL");

      window.location.href = data.auth_url;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setShopifyLoading(false);
    }
  };

  const connectWooCommerce = async () => {
    if (!wooStoreUrl.trim() || !agentId) return;
    setWooLoading(true);
    try {
      const cleanUrl = wooStoreUrl.replace(/\/+$/, "").trim();

      await supabase.from("woocommerce_connections" as any).upsert({
        agent_id: agentId, store_url: cleanUrl,
        consumer_key: "pending_oauth", consumer_secret: "pending_oauth",
      }, { onConflict: "agent_id" });

      const { data, error } = await supabase.functions.invoke("woocommerce-auth-url", {
        body: { store_url: cleanUrl, agent_id: agentId, redirect_origin: window.location.origin },
      });
      if (error || !data?.auth_url) throw new Error("Failed to generate auth URL");

      window.location.href = data.auth_url;
    } catch (err: any) {
      await supabase.from("woocommerce_connections" as any).delete().eq("agent_id", agentId);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setWooLoading(false);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    if (storageKey && messages.length > 0) {
      try { localStorage.setItem(storageKey, JSON.stringify(messages)); } catch {}
    }
  }, [messages, storageKey]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // If we restored messages from storage, skip the initial system boot
    if (messages.length > 0) return;

    sendToConfigurator([], true);
  }, [messages.length, seedMessage]);

  const processManagementActions = useCallback(async (text: string): Promise<string[]> => {
    if (!agentId) return [];
    const actions = [
      { marker: "ADD_PRODUCT", handler: async (data: any) => {
        const { error } = await supabase.from("products").insert({ agent_id: agentId, name: data.name, price: data.price || 0, currency: data.currency || "USD", description: data.description || null, category: data.category || null, variants: data.variants || [], metadata: data.metadata || {} } as any);
        if (error) throw error;
        return `✅ Product "${data.name}" added`;
      }},
      { marker: "ADD_SERVICE", handler: async (data: any) => {
        const { error } = await supabase.from("services").insert({ agent_id: agentId, name: data.name, price: data.price || 0, currency: data.currency || "USD", duration_minutes: data.duration_minutes || 30, description: data.description || null, category: data.category || null, variants: data.variants || [], metadata: data.metadata || {} } as any);
        if (error) throw error;
        return `✅ Service "${data.name}" added`;
      }},
      { marker: "UPDATE_AGENT", handler: async (data: any) => {
        const updates: any = {};
        if (data.name) updates.name = data.name;
        if (data.welcome_message) updates.welcome_message = data.welcome_message;
        if (data.personality) updates.personality = data.personality;
        if (data.status) updates.status = data.status;
        if (data.default_currency) updates.default_currency = data.default_currency;
        const { error } = await supabase.from("agents").update(updates).eq("id", agentId);
        if (error) throw error;
        return `✅ Agent settings updated`;
      }},
      { marker: "DELETE_PRODUCT", handler: async (data: any) => {
        const { error } = await supabase.from("products").delete().eq("id", data.id).eq("agent_id", agentId);
        if (error) throw error;
        return `✅ Product deleted`;
      }},
      { marker: "DELETE_SERVICE", handler: async (data: any) => {
        const { error } = await supabase.from("services").delete().eq("id", data.id).eq("agent_id", agentId);
        if (error) throw error;
        return `✅ Service deleted`;
      }},
      { marker: "ADD_DOCUMENT_TEMPLATE", handler: async (data: any) => {
        const defaultFields = data.template_type === "invoice" ? [
          { id: "customer_name", label: "Customer Name", type: "text", required: true },
          { id: "items", label: "Line Items", type: "items", required: true },
          { id: "due_date", label: "Due Date", type: "date", required: false },
          { id: "notes", label: "Notes", type: "textarea", required: false },
        ] : data.template_type === "quotation" ? [
          { id: "customer_name", label: "Customer Name", type: "text", required: true },
          { id: "items", label: "Line Items", type: "items", required: true },
          { id: "valid_until", label: "Valid Until", type: "date", required: false },
        ] : data.template_type === "receipt" ? [
          { id: "customer_name", label: "Customer Name", type: "text", required: true },
          { id: "items", label: "Line Items", type: "items", required: true },
          { id: "payment_method", label: "Payment Method", type: "text", required: true },
        ] : [];
        const { error } = await supabase.from("document_templates").insert({
          agent_id: agentId, name: data.name, template_type: data.template_type || "custom",
          description: data.description || null, fields: data.fields || defaultFields,
          content_sections: data.content_sections || [], styling: data.styling || {},
          business_info: data.business_info || {},
        });
        if (error) throw error;
        return `✅ Document template "${data.name}" created`;
      }},
      { marker: "DELETE_DOCUMENT_TEMPLATE", handler: async (data: any) => {
        const { error } = await supabase.from("document_templates").delete().eq("id", data.id).eq("agent_id", agentId);
        if (error) throw error;
        return `✅ Document template deleted`;
      }},
      { marker: "ADD_CAPABILITY", handler: async () => `✅ Capability noted` },
      { marker: "ADD_RULE", handler: async () => `✅ Rule noted` },
      { marker: "ADD_FAQ", handler: async (data: any) => {
        const { error } = await supabase.from("faqs").insert({
          agent_id: agentId,
          question: data.question,
          answer: data.answer,
          is_active: true,
          sort_order: 0,
        });
        if (error) throw error;
        return `✅ FAQ added: "${data.question}"`;
      }},
      { marker: "UPDATE_BUSINESS", handler: async () => `✅ Business info noted` },
    ];

    const results: string[] = [];
    for (const { marker, handler } of actions) {
      const regex = new RegExp(`\\[${marker}\\](.*?)\\[/${marker}\\]`, "gs");
      let match;
      while ((match = regex.exec(text)) !== null) {
        try {
          const data = JSON.parse(match[1]);
          const result = await handler(data);
          results.push(result);
        } catch (e: any) {
          results.push(`❌ ${marker} failed: ${e.message}`);
        }
      }
    }

    if (results.length > 0) {
      console.log("Config actions executed:", results);
    }
    return results;
  }, [agentId]);

  const sendToConfigurator = async (msgs: Msg[], isSystemInit = false, imageUrls?: string[], retryCount = 0) => {
    setIsLoading(true);
    
    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/configure-agent`;
      let requestMessages = isSystemInit
        ? [{ role: "user" as const, content: seedMessage }]
        : buildConfiguratorConversation(msgs, seedMessage);

      // Trim conversation to last 16 messages (+ seed) to avoid oversized payloads on mobile
      const MAX_CONTEXT_MESSAGES = 16;
      if (requestMessages.length > MAX_CONTEXT_MESSAGES + 1) {
        // Keep the seed message (first) and the most recent messages
        requestMessages = [
          requestMessages[0],
          ...requestMessages.slice(-(MAX_CONTEXT_MESSAGES)),
        ];
      }
      
      // Refresh session to get a valid token
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messages: requestMessages,
          systemPrompt: CONFIGURATOR_SYSTEM_PROMPT,
          agentId,
          imageUrls: imageUrls?.length ? imageUrls : undefined,
        }),
      });

      if (resp.status === 402) {
        toast({ title: "AI Credits Exhausted", description: "You don't have enough AI credits. Please upgrade your package.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      if (resp.status === 429) {
        toast({ title: "Rate Limited", description: "Too many requests. Please try again in a moment.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      if (!resp.ok || !resp.body) {
        let errMsg = "Failed to connect to AI";
        try {
          const errData = await resp.json();
          if (errData?.error) errMsg = errData.error;
        } catch {}
        console.error("configure-agent error:", resp.status, errMsg);
        throw new Error(errMsg);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullResponse = "";

      const updateAssistant = (content: string) => {
        const visibleContent = stripAllMarkers(content);
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: visibleContent } : m));
          }
          return [...prev, { role: "assistant", content: visibleContent }];
        });
      };

      while (true) {
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
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullResponse += content;
              updateAssistant(fullResponse);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Extract and pass summary to parent for phone preview
      const summaryMatch = fullResponse.match(/\[SUMMARY\]([\s\S]*?)\[\/SUMMARY\]/);
      if (summaryMatch && onSummaryUpdate) {
        onSummaryUpdate(summaryMatch[1].trim());
      }

      // Process management actions if agentId exists
      if (agentId) {
        const actionResults = await processManagementActions(fullResponse);
        // Filter out error results — only show success markers
        const successResults = actionResults.filter(r => !r.startsWith("❌"));
        const visibleText = stripAllMarkers(fullResponse).trim();
        if (successResults.length > 0 && !visibleText) {
          const resultText = successResults.join("\n");
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: resultText } : m));
            }
            return [...prev, { role: "assistant", content: resultText }];
          });
        } else if (successResults.length > 0 && visibleText) {
          const hasResults = successResults.some(r => visibleText.includes(r));
          if (!hasResults) {
            const combined = visibleText + "\n\n" + successResults.join("\n");
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: combined } : m));
              }
              return [...prev, { role: "assistant", content: combined }];
            });
          }
        }
      }

      // Check if config is ready
      if (fullResponse.includes("[CONFIG_READY]")) {
        const jsonMatch = fullResponse.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          try {
            const config = JSON.parse(jsonMatch[1]) as ExtractedConfig;
            setConfigExtracted(true);
            onConfigReady(config);
            toast({ title: "✨ Preview updated!", description: "Your agent preview is now live. Keep chatting to make changes." });
          } catch (e) {
            console.error("Failed to parse config JSON:", e);
          }
        }
      }

      // Auto-speak assistant response if voice mode is on
      const visibleResponse = stripAllMarkers(fullResponse);
      if (voiceMode && visibleResponse) speak(visibleResponse);
    } catch (e: any) {
      const msg = e?.message || "Failed to get response. Please try again.";
      // Retry once on network-level failures (Safari "Load failed", connection reset, etc.)
      if (retryCount < 1 && /load failed|failed to fetch|network/i.test(msg)) {
        console.warn("Network error, retrying...", msg);
        return sendToConfigurator(msgs, isSystemInit, imageUrls, retryCount + 1);
      }
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const send = async (overrideText?: string) => {
    const text = overrideText || input.trim();
    if (!text && pendingAttachments.length === 0) return;
    if (isLoading) return;

    // Build message with attachments
    let messageContent = text || "";
    const attachments = [...pendingAttachments];

    if (attachments.length > 0) {
      const imageAttachments = attachments.filter(a => a.type === "image");
      const fileAttachments = attachments.filter(a => a.type === "file");

      if (imageAttachments.length > 0) {
        messageContent += `\n\n[Attached ${imageAttachments.length} image(s): ${imageAttachments.map(a => a.name).join(", ")}. Please analyze these images carefully — extract any products, services, pricing, menus, inventory, or business information visible in them.]`;
      }
      if (fileAttachments.length > 0) {
        fileAttachments.forEach(a => {
          messageContent += `\n\n--- Content from "${a.name}" ---\n${a.extractedText?.slice(0, 8000) || "(empty)"}\n--- END ---\n\nPlease analyze this document carefully — extract ALL products, services, pricing, inventory, business details, contact info, FAQs, and policies. Then offer to add them to the agent configuration using action markers.`;
        });
      }
    }

    // Display message (simplified for images/docs)
    const displayContent = attachments.length > 0
      ? (text || "") + attachments.map(a => a.type === "image" ? ` 🖼️ ${a.name}` : ` 📄 ${a.name}`).join("")
      : text;
    const displayMsg: Msg = {
      role: "user",
      content: displayContent.trim(),
      rawContent: messageContent,
      attachments: attachments.map((a) => ({ type: a.type, url: a.url, name: a.name })),
    };

    const newMessages = [...messages, displayMsg];
    setMessages(newMessages);
    if (!overrideText) setInput("");
    setPendingAttachments([]);

    const imageUrls = attachments.filter(a => a.type === "image").map(a => a.url);
    await sendToConfigurator(newMessages as Msg[], false, imageUrls);
  };

  sendVoiceRef.current = (text: string) => send(text);

  useImperativeHandle(ref, () => ({
    requestFinalize: () => {
      send("I'm happy with the configuration. Please finalize it now.");
    },
  }), [messages, isLoading]);

  const handleButtonAction = useCallback((text: string) => {
    send(text);
  }, [messages, isLoading]);

  const handleFileUpload = async (files: FileList) => {
    setUploading(true);
    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith("image/");
      const isDoc = isSupportedDocument(file);

      if (!isImage && !isDoc) {
        toast({ title: "Unsupported file", description: "Upload images, PDFs, or text files.", variant: "destructive" });
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: "Max 10MB per file.", variant: "destructive" });
        continue;
      }

      if (isImage) {
        // Upload image to storage for vision analysis
        const ext = file.name.split(".").pop() || "png";
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;
        if (!userId) {
          toast({ title: "Upload failed", description: "You must be logged in to upload files.", variant: "destructive" });
          continue;
        }
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("agent-media").upload(path, file, { cacheControl: "3600", upsert: false });
        if (error) {
          toast({ title: "Upload failed", description: error.message, variant: "destructive" });
          continue;
        }
        const { data: urlData } = supabase.storage.from("agent-media").getPublicUrl(path);
        setPendingAttachments(prev => [...prev, { type: "image", url: urlData.publicUrl, name: file.name }]);
      } else {
        // Extract text from document
        const result = await extractDocumentText(file);
        if (result.success && result.content) {
          setPendingAttachments(prev => [...prev, { type: "file", url: "", name: file.name, extractedText: result.content }]);
        } else {
          toast({ title: "Extraction failed", description: result.error || "Could not read file.", variant: "destructive" });
        }
      }
    }
    setUploading(false);
  };

  const removeAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleUrlScrape = async () => {
    if (!urlInput.trim()) return;
    setIsScrapingUrl(true);
    try {
      const result = await scrapeWebsite(urlInput.trim());
      if (result.success && result.data?.markdown) {
        setShowUrlDialog(false);
        const displayMsg: Msg = {
          role: "user",
          content: `🌐 URL: ${urlInput}`,
          rawContent: buildImportedWebsiteMessage(urlInput, result.data?.metadata?.title, result.data.markdown),
        };
        const newMessages = [...messages, displayMsg];
        setMessages(newMessages);
        await sendToConfigurator(newMessages);
        toast({ title: "🌐 Website content loaded!", description: `Content from ${result.data?.metadata?.title || urlInput} shared with assistant.` });
        setUrlInput("");
      } else {
        toast({ title: "Scrape failed", description: result.error || "Could not extract content from URL", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsScrapingUrl(false);
    }
  };

  return (
    <Card data-guide="config-chat" className="glass border-border/50 card-shadow flex flex-col h-[calc(100vh-180px)] sm:h-[calc(100vh-200px)] xl:h-[600px]">
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-border/50 flex items-center gap-2 sm:gap-3">
        <div className="rounded-full bg-primary/20 p-1.5 sm:p-2">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold text-sm">Configuration Assistant</p>
          <p className="text-xs text-muted-foreground hidden sm:block">I'll guide you step-by-step to set up your AI agent — just answer my questions!</p>
        </div>
        {configExtracted && (
          <div className="flex items-center gap-1 text-accent text-xs font-medium shrink-0">
            <CheckCircle2 className="h-4 w-4" /> <span className="hidden sm:inline">Configured</span>
          </div>
        )}
        <VoiceModeToggle voiceMode={voiceMode} onToggle={toggleVoiceMode} isSpeaking={isSpeaking} className="ml-auto" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}
          >
            {msg.role === "assistant" && (
              <div className="rounded-full bg-primary/20 p-1.5 h-7 w-7 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <div className={`rounded-xl px-3 py-2 max-w-[85%] text-sm ${
              msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"
            }`}>
              {msg.role === "assistant" ? (
                <InteractiveChatMessage
                  content={msg.content}
                  onAction={handleButtonAction}
                  isLatest={i === messages.length - 1}
                />
              ) : (
                <>
                  {msg.content}
                  {msg.attachments?.map((a, j) => (
                    <div key={j} className="mt-1">
                      {a.type === "image" ? (
                        <img src={a.url} alt={a.name} className="rounded max-h-32 mt-1" />
                      ) : (
                        <span className="text-xs opacity-70">📄 {a.name}</span>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
            {msg.role === "user" && (
              <div className="rounded-full bg-secondary p-1.5 h-7 w-7 flex items-center justify-center shrink-0 mt-0.5">
                <User className="h-3.5 w-3.5" />
              </div>
            )}
          </motion.div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-2">
            <div className="rounded-full bg-primary/20 p-1.5 h-7 w-7 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="bg-secondary rounded-xl px-3 py-2 flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: "0.2s" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: "0.4s" }} />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Suggestion chips — shown when conversation just started */}
      {messages.length <= 2 && !isLoading && (
        <div className="px-3 py-2 border-t border-border/30 flex flex-wrap gap-1.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/60 bg-secondary/50 hover:bg-secondary text-xs font-medium transition-colors"
          >
            <Upload className="h-3 w-3" /> Upload a file as knowledge
          </button>
          <button
            onClick={() => setShowUrlDialog(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/60 bg-secondary/50 hover:bg-secondary text-xs font-medium transition-colors"
          >
            <Globe className="h-3 w-3" /> Provide your website URL
          </button>
          <button
            onClick={() => setShowShopifyDialog(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/60 bg-secondary/50 hover:bg-secondary text-xs font-medium transition-colors"
          >
            <img src={shopifyLogo} alt="Shopify" className="h-3.5 w-3.5 object-contain" /> Connect Shopify Store
          </button>
          <button
            onClick={() => setShowWooDialog(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/60 bg-secondary/50 hover:bg-secondary text-xs font-medium transition-colors"
          >
            <img src={woocommerceLogo} alt="WooCommerce" className="h-3.5 w-3.5 object-contain" /> Connect WooCommerce Store
          </button>
        </div>
      )}

      {/* Pending attachments preview */}
      {pendingAttachments.length > 0 && (
        <div className="px-3 py-2 border-t border-border/50 flex gap-2 flex-wrap">
          {pendingAttachments.map((a, i) => (
            <div key={i} className="relative group">
              {a.type === "image" ? (
                <img src={a.url} alt={a.name} className="h-12 w-12 rounded object-cover border border-border" />
              ) : (
                <div className="h-12 px-2 rounded bg-secondary border border-border flex items-center gap-1 text-xs">
                  <FileText className="h-3 w-3" /> {a.name.slice(0, 15)}
                </div>
              )}
              <button
                onClick={() => removeAttachment(i)}
                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div data-guide="chat-input-area" className="border-t border-border/50 p-2 sm:p-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,.csv,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.tif,text/plain,application/pdf,image/*"
          className="hidden"
          multiple
          onChange={(e) => {
            if (e.target.files) handleFileUpload(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="flex gap-1.5 sm:gap-2 items-end">
          <div className="flex gap-0.5 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 h-8 w-8 sm:h-10 sm:w-10"
              disabled={isLoading || uploading}
              onClick={() => fileInputRef.current?.click()}
              title="Upload documents or images"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" /> : <Paperclip className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 h-8 w-8 sm:h-10 sm:w-10"
              disabled={isLoading || isScrapingUrl}
              onClick={() => setShowUrlDialog(true)}
              title="Import from URL"
            >
              {isScrapingUrl ? <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" /> : <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            </Button>
          </div>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder={configExtracted ? "Make changes..." : "Type your answer..."}
            disabled={isLoading}
            className="flex-1 min-w-0 h-9 sm:h-10 text-sm"
          />
          <div className="flex gap-0.5 shrink-0">
            <VoiceButton isRecording={isRecording} isTranscribing={isTranscribing} onClick={toggleRecording} disabled={isLoading} />
            <Button
              onClick={() => send()}
              disabled={isLoading || (!input.trim() && pendingAttachments.length === 0)}
              className="bg-primary hover:bg-primary/90 h-8 w-8 sm:h-10 sm:w-10"
              size="icon"
            >
              <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* URL Import Dialog */}
      <Dialog open={showUrlDialog} onOpenChange={setShowUrlDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" /> Import from URL
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Enter a URL and we'll extract the content to share with the configuration assistant.
          </p>
          <div className="space-y-3">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://yourwebsite.com/about"
              className="h-12"
              onKeyDown={(e) => e.key === "Enter" && handleUrlScrape()}
              disabled={isScrapingUrl}
            />
            <Button
              onClick={handleUrlScrape}
              disabled={!urlInput.trim() || isScrapingUrl}
              className="w-full gap-2"
            >
              {isScrapingUrl ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Extracting content…
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4" /> Fetch & Import
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shopify Connection Dialog */}
      <Dialog open={showShopifyDialog} onOpenChange={setShowShopifyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img src={shopifyLogo} alt="Shopify" className="h-6 w-6 object-contain" /> Connect Shopify Store
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Enter your Shopify store domain to connect via OAuth. Your products will be synced automatically.
          </p>
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Store Domain</Label>
              <Input
                value={shopifyDomain}
                onChange={(e) => setShopifyDomain(e.target.value)}
                placeholder="yourstore.myshopify.com"
                className="h-12 mt-1"
                onKeyDown={(e) => e.key === "Enter" && connectShopify()}
                disabled={shopifyLoading}
              />
            </div>
            <Button
              onClick={connectShopify}
              disabled={!shopifyDomain.trim() || shopifyLoading || !agentId}
              className="w-full gap-2"
            >
              {shopifyLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Connecting…</>
              ) : (
                <><img src={shopifyLogo} alt="Shopify" className="h-4 w-4 object-contain" /> Continue with Shopify</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* WooCommerce Connection Dialog */}
      <Dialog open={showWooDialog} onOpenChange={setShowWooDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img src={woocommerceLogo} alt="WooCommerce" className="h-6 w-6 object-contain" /> Connect WooCommerce Store
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Enter your WooCommerce store URL. You'll be redirected to approve the connection — no API keys needed.
          </p>
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Store URL</Label>
              <Input
                value={wooStoreUrl}
                onChange={(e) => setWooStoreUrl(e.target.value)}
                placeholder="https://yourstore.com"
                className="h-12 mt-1"
                onKeyDown={(e) => e.key === "Enter" && connectWooCommerce()}
                disabled={wooLoading}
              />
            </div>
            <Button
              onClick={connectWooCommerce}
              disabled={!wooStoreUrl.trim() || wooLoading || !agentId}
              className="w-full gap-2"
            >
              {wooLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Connecting…</>
              ) : (
                <><img src={woocommerceLogo} alt="WooCommerce" className="h-4 w-4 object-contain" /> Connect WooCommerce</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
});

export default ConfiguratorChat;
