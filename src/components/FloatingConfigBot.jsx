import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, X, Sparkles, User, History, Trash2, Globe, Paperclip, Loader2, FileText, Image as ImageIcon, Video, FileAudio, Phone, Maximize2, Minimize2, MessageCircle, ArrowRight } from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useVoiceCall } from "@/hooks/useVoiceCall";
import VoiceButton from "@/components/VoiceButton";
import VoiceModeToggle from "@/components/VoiceModeToggle";
import VoiceCallModal from "@/components/VoiceCallModal";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import InteractiveChatMessage from "@/components/InteractiveChatMessage";
import { motion, AnimatePresence } from "framer-motion";
import type { Agent } from "@/types/agent";
import { AGENT_TYPE_LABELS, PERSONALITY_LABELS } from "@/types/agent";
import { scrapeWebsite } from "@/lib/firecrawl";
import { extractDocumentText, isSupportedDocument } from "@/lib/documentExtract";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import WhatsAppTab from "@/components/WhatsAppTab";
import ImageTriageDialog, { type TriageAction } from "@/components/ImageTriageDialog";

type AttachmentType = "image" | "video" | "audio" | "file";
type Msg = {
  role: "user" | "assistant";
  content: string;
  displayContent?: string; // optional friendly text shown to user instead of raw content
  attachments?: { type: AttachmentType; url: string; name: string }[];
};

interface Props {
  agent: Agent;
  onAgentUpdated: () => void;
}

const STORAGE_KEY = (agentId: string) => `config_bot_history_${agentId}`;

const ACTION_MARKERS = [
  "ADD_PRODUCT", "UPDATE_PRODUCT", "DELETE_PRODUCT",
  "ADD_SERVICE", "UPDATE_SERVICE", "DELETE_SERVICE",
  "UPDATE_AGENT", "UPDATE_ORDER", "UPDATE_BOOKING", "UPDATE_INQUIRY",
  "ADD_AVAILABILITY", "UPDATE_AVAILABILITY", "DELETE_AVAILABILITY",
  "ADD_PAYMENT_METHOD", "UPDATE_PAYMENT_METHOD", "DELETE_PAYMENT_METHOD",
  "BULK_UPDATE_PRODUCTS", "BULK_EDIT_PRODUCTS", "BULK_UPDATE_SERVICES", "BULK_EDIT_SERVICES",
  "ADD_CAPABILITY", "ADD_RULE", "ADD_FAQ", "UPDATE_BUSINESS",
  "ADD_DOCUMENT_TEMPLATE", "DELETE_DOCUMENT_TEMPLATE", "SCRAPE_URL",
] as const;

function stripErrorResults(text: string): string {
  return text
    .split("\n")
    .filter(line => !line.trim().startsWith("❌"))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function loadHistory(agentId: string): Msg[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(agentId));
    if (!raw) return [];
    const parsed: Msg[] = JSON.parse(raw);
    return parsed.map(m => m.role === "assistant"
      ? { ...m, content: stripErrorResults(m.content) }
      : m
    ).filter(m => m.content.trim() !== "");
  } catch { return []; }
}

function saveHistory(agentId: string, msgs: Msg[]) {
  localStorage.setItem(STORAGE_KEY(agentId), JSON.stringify(msgs.slice(-100)));
}

function stripActionBlocks(text: string) {
  let cleaned = text;
  for (const marker of ACTION_MARKERS) {
    // Match closed markers (greedy to handle nested braces/brackets)
    cleaned = cleaned.replace(new RegExp(`\\[${marker}\\][\\s\\S]*?\\[\\/${marker}\\]`, "g"), "");
    // Also strip unclosed markers (LLM didn't close the tag)
    cleaned = cleaned.replace(new RegExp(`\\[${marker}\\]\\s*\\{[\\s\\S]*?\\}(?:\\s*\\[\\/${marker}\\])?`, "g"), "");
    cleaned = cleaned.replace(new RegExp(`\\[${marker}\\]\\s*\\[[\\s\\S]*?\\](?:\\s*\\[\\/${marker}\\])?`, "g"), "");
  }
  // Strip any remaining standalone JSON code blocks
  cleaned = cleaned.replace(/```json[\s\S]*?```/g, "");
  return cleaned;
}

async function buildDashboardContext(agent: Agent): Promise<string> {
  let ctx = `\n\n--- CURRENT DASHBOARD STATE ---\n`;
  ctx += `Agent: "${agent.name}" (${AGENT_TYPE_LABELS[agent.agent_type]})\n`;
  ctx += `Personality: ${PERSONALITY_LABELS[agent.personality]}\n`;
  ctx += `Status: ${agent.status}\n`;
  ctx += `Currency: ${agent.default_currency || "USD"}\n`;
  ctx += `Language: ${agent.default_language || "auto"}\n`;
  ctx += `Welcome Message: ${agent.welcome_message}\n`;

  if (agent.knowledge_base) {
    const metaMarker = "---AGENT_META---";
    const idx = agent.knowledge_base.indexOf(metaMarker);
    if (idx !== -1) {
      try {
        const meta = JSON.parse(agent.knowledge_base.slice(idx + metaMarker.length).trim());
        if (meta.capabilities?.length) ctx += `Capabilities: ${meta.capabilities.join(", ")}\n`;
        if (meta.businessHours) ctx += `Business Hours: ${meta.businessHours}\n`;
        if (meta.contactInfo) ctx += `Contact Info: ${meta.contactInfo}\n`;
        if (meta.rules?.length) ctx += `Rules: ${meta.rules.join("; ")}\n`;
        if (meta.faqs?.length) ctx += `FAQs: ${meta.faqs.length} configured\n`;
      } catch {}
    }
  }

  const currency = agent.default_currency || "USD";

  // Load ALL dashboard data
  const [productsRes, servicesRes, docTemplatesRes, bookingsRes, ordersRes, inquiriesRes, availRes, paymentRes, fieldsRes, faqsRes, convosRes] = await Promise.all([
    supabase.from("products").select("id, name, price, currency, category, is_available, description, variants, image_url, stock_quantity").eq("agent_id", agent.id),
    supabase.from("services").select("id, name, price, currency, duration_minutes, category, is_available, description, variants, image_url").eq("agent_id", agent.id),
    supabase.from("document_templates").select("id, name, template_type, is_active, description, business_info").eq("agent_id", agent.id),
    supabase.from("bookings").select("id, customer_name, customer_email, customer_phone, booking_date, start_time, end_time, status, notes, created_at").eq("agent_id", agent.id).order("booking_date", { ascending: false }).limit(50),
    supabase.from("orders").select("id, order_number, customer_name, customer_email, customer_phone, status, payment_status, payment_method, subtotal, tax, total, delivery_address, notes, created_at").eq("agent_id", agent.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("inquiries").select("id, customer_name, customer_email, customer_phone, subject, message, status, custom_fields, created_at").eq("agent_id", agent.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("agent_availability").select("*").eq("agent_id", agent.id).order("day_of_week"),
    supabase.from("agent_payment_methods").select("*").eq("agent_id", agent.id),
    supabase.from("agent_collect_fields").select("*").eq("agent_id", agent.id).order("sort_order"),
    supabase.from("faqs").select("id, question, answer, linked_product_id, is_active").eq("agent_id", agent.id).order("sort_order").order("created_at", { ascending: false }),
    supabase.from("conversations").select("id").eq("agent_id", agent.id),
  ]);

  // Stats
  const totalConvos = convosRes.data?.length || 0;
  const totalOrders = ordersRes.data?.length || 0;
  const totalBookings = bookingsRes.data?.length || 0;
  const totalInquiries = inquiriesRes.data?.length || 0;
  ctx += `\n📊 Stats: ${totalConvos} conversations, ${totalOrders} orders, ${totalBookings} bookings, ${totalInquiries} inquiries\n`;

  if (productsRes.data?.length) {
    ctx += `\n📦 Products (${productsRes.data.length}):\n`;
    productsRes.data.forEach(p => {
      const pc = (p as any).currency || currency;
      const stock = (p as any).stock_quantity !== null ? ` (${(p as any).stock_quantity} in stock)` : "";
      ctx += `- ${p.name}: ${pc} ${Number(p.price).toFixed(2)}${stock} [${p.is_available ? "available" : "unavailable"}] ${p.category ? `(${p.category})` : ""} ${(p as any).description ? `— ${(p as any).description}` : ""} ID:${p.id}\n`;
    });
  } else {
    ctx += `\n📦 Products: None\n`;
  }

  if (servicesRes.data?.length) {
    ctx += `\n🛎️ Services (${servicesRes.data.length}):\n`;
    servicesRes.data.forEach(s => {
      const sc = (s as any).currency || currency;
      ctx += `- ${s.name}: ${sc} ${Number(s.price).toFixed(2)}, ${s.duration_minutes}min [${s.is_available ? "available" : "unavailable"}] ${s.category ? `(${s.category})` : ""} ${(s as any).description ? `— ${(s as any).description}` : ""} ID:${s.id}\n`;
    });
  } else {
    ctx += `\n🛎️ Services: None\n`;
  }

  if (docTemplatesRes.data?.length) {
    ctx += `\n📄 Document Templates (${docTemplatesRes.data.length}):\n`;
    docTemplatesRes.data.forEach(d => {
      const bi = (d.business_info as any) || {};
      ctx += `- ${d.name} (${d.template_type}) [${d.is_active ? "active" : "disabled"}] ${bi.company_name ? `for ${bi.company_name}` : ""} ID:${d.id}\n`;
    });
  }

  const linkableCatalogItems = [
    ...(productsRes.data || []).map((item) => ({ id: item.id, name: item.name })),
    ...(servicesRes.data || []).map((item) => ({ id: item.id, name: item.name })),
  ];

  if (faqsRes.data?.length) {
    ctx += `\n❓ FAQs (${faqsRes.data.length}):\n`;
    faqsRes.data.forEach((faq: any) => {
      const linkedItemName = faq.linked_product_id
        ? linkableCatalogItems.find((item) => item.id === faq.linked_product_id)?.name
        : null;
      const answerPreview = typeof faq.answer === "string" && faq.answer.length > 180
        ? `${faq.answer.slice(0, 177)}...`
        : faq.answer;

      ctx += `- ${faq.question} [${faq.is_active ? "active" : "inactive"}]`;
      if (linkedItemName) {
        ctx += ` (linked to ${linkedItemName}, ID:${faq.linked_product_id})`;
      }
      if (answerPreview) {
        ctx += ` — ${answerPreview}`;
      }
      ctx += ` ID:${faq.id}\n`;
    });
  } else {
    ctx += `\n❓ FAQs: None\n`;
  }

  if (ordersRes.data?.length) {
    ctx += `\n🛒 Recent Orders (${ordersRes.data.length}):\n`;
    ordersRes.data.forEach((o: any) => {
      ctx += `- #${o.order_number}: ${o.customer_name} — ${currency} ${Number(o.total).toFixed(2)} [${o.status}] [payment: ${o.payment_status}] ${o.created_at?.slice(0, 10)} ID:${o.id}\n`;
    });
  }

  if (bookingsRes.data?.length) {
    ctx += `\n📅 Recent Bookings (${bookingsRes.data.length}):\n`;
    bookingsRes.data.forEach((b: any) => {
      ctx += `- ${b.customer_name}: ${b.booking_date} ${b.start_time}-${b.end_time} [${b.status}] ${b.customer_email ? `(${b.customer_email})` : ""} ID:${b.id}\n`;
    });
  }

  if (inquiriesRes.data?.length) {
    ctx += `\n📬 Recent Inquiries (${inquiriesRes.data.length}):\n`;
    inquiriesRes.data.forEach((i: any) => {
      ctx += `- ${i.customer_name}: ${i.subject || "No subject"} [${i.status}] ${i.created_at?.slice(0, 10)} ID:${i.id}\n`;
    });
  }

  if (availRes.data?.length) {
    const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    ctx += `\n🕐 Availability Schedule:\n`;
    availRes.data.forEach((s: any) => {
      ctx += `- ${DAYS[s.day_of_week]}: ${s.start_time}-${s.end_time} (${s.slot_duration_minutes}min slots) [${s.is_available ? "active" : "disabled"}] ID:${s.id}\n`;
    });
  }

  if (paymentRes.data?.length) {
    ctx += `\n💳 Payment Methods:\n`;
    paymentRes.data.forEach((p: any) => {
      ctx += `- ${p.method_name} (${p.method_type}) [${p.is_enabled ? "enabled" : "disabled"}] ${p.instructions ? `— ${p.instructions}` : ""} ID:${p.id}\n`;
    });
  }

  if (fieldsRes.data?.length) {
    ctx += `\n📋 Collect Fields:\n`;
    fieldsRes.data.forEach((f: any) => {
      ctx += `- ${f.field_label} (${f.field_type})${f.is_required ? " [required]" : ""} ID:${f.id}\n`;
    });
  }

  return ctx;
}

const MANAGE_SYSTEM_PROMPT = `You are the BuildStart Management Assistant — a powerful bot embedded in the agent management dashboard with FULL ACCESS to read and modify all business data.

You have complete visibility into the dashboard: products, services, FAQs, orders, bookings, inquiries, availability, payment methods, collect fields, document templates, and agent settings. All current data is provided below.

## INTERACTIVE UI FORMAT

You MUST use these special markers to create interactive, structured responses:

### Quick-Select Buttons
[BUTTONS: Option A | Option B | Option C]

### Summary Cards
[SUMMARY]
**📦 Products:** 3 items
**🛎️ Services:** 2 items
[/SUMMARY]

### Step Sections
[STEP: 📦 Adding Product]
Setting up your new product...
[/STEP]

## RESPONSE STYLE RULES
1. **Use buttons** for yes/no, confirmations, and quick choices
2. **Keep responses short** — bullet points over paragraphs
3. **Show summaries** after making changes
4. **Confirm before destructive actions** using [BUTTONS: ✅ Yes, do it | ❌ Cancel]
5. When user asks about dashboard data (orders, bookings, stats), answer directly from the data provided — you have FULL access

## FULL CRUD ACTIONS
You can perform ALL these actions by outputting special markers:

### Agent Settings
[UPDATE_AGENT]{"name":"New Name","welcome_message":"msg","personality":"friendly","status":"active","default_currency":"LKR","default_language":"en"}[/UPDATE_AGENT]
- Fields are all optional, include only what needs changing
- personality: "professional" | "friendly" | "casual"
- status: "draft" | "active" | "paused"

### Products (Create / Update / Delete)
[ADD_PRODUCT]{"name":"Name","price":9.99,"currency":"USD","description":"Desc","category":"Cat","stock_quantity":100,"variants":[],"metadata":{}}[/ADD_PRODUCT]
[UPDATE_PRODUCT]{"id":"uuid","name":"New Name","price":12.99,"currency":"USD","description":"New desc","category":"Cat","is_available":true,"stock_quantity":50}[/UPDATE_PRODUCT]
[DELETE_PRODUCT]{"id":"uuid"}[/DELETE_PRODUCT]

### Services (Create / Update / Delete)
[ADD_SERVICE]{"name":"Name","price":29.99,"currency":"USD","duration_minutes":30,"description":"Desc","category":"Cat","variants":[],"metadata":{}}[/ADD_SERVICE]
[UPDATE_SERVICE]{"id":"uuid","name":"New Name","price":39.99,"currency":"USD","duration_minutes":60,"description":"New desc","category":"Cat","is_available":true}[/UPDATE_SERVICE]
[DELETE_SERVICE]{"id":"uuid"}[/DELETE_SERVICE]

### CUSTOM/NON-STANDARD FIELDS (CRITICAL)
For ANY attribute the user mentions that doesn't fit the standard fields above (negotiable price, warranty, minimum order quantity, material, custom tags, special notes, flags, etc.), include them in the "metadata" object.
- Example: [ADD_PRODUCT]{"name":"Silk Saree","price":500,"currency":"LKR","metadata":{"negotiable":true,"warranty":"1 year"}}[/ADD_PRODUCT]
- Example: [ADD_SERVICE]{"name":"Consultation","price":50,"currency":"USD","duration_minutes":60,"metadata":{"online_available":true,"cancellation_policy":"24h notice"}}[/ADD_SERVICE]
- NEVER refuse to add a custom attribute. ALWAYS store it in metadata.
- NEVER suggest putting custom attributes in the description instead — use metadata.

### Orders (Update status)
[UPDATE_ORDER]{"id":"uuid","status":"confirmed","payment_status":"paid","notes":"Updated note"}[/UPDATE_ORDER]

### Bookings (Update status)
[UPDATE_BOOKING]{"id":"uuid","status":"confirmed","notes":"Updated note"}[/UPDATE_BOOKING]
- status: "confirmed" | "cancelled" | "completed" | "no-show"

### Inquiries (Update status)
[UPDATE_INQUIRY]{"id":"uuid","status":"resolved"}[/UPDATE_INQUIRY]
- status: "new" | "in-progress" | "resolved" | "closed"

### Availability (Create / Update / Delete)
[ADD_AVAILABILITY]{"day_of_week":1,"start_time":"09:00","end_time":"17:00","slot_duration_minutes":30}[/ADD_AVAILABILITY]
[UPDATE_AVAILABILITY]{"id":"uuid","start_time":"10:00","end_time":"18:00","is_available":true,"slot_duration_minutes":60}[/UPDATE_AVAILABILITY]
[DELETE_AVAILABILITY]{"id":"uuid"}[/DELETE_AVAILABILITY]
- day_of_week: 0=Sunday, 1=Monday, ..., 6=Saturday

### Payment Methods (Create / Update / Delete)
[ADD_PAYMENT_METHOD]{"method_name":"Cash","method_type":"cash","instructions":"Pay on delivery"}[/ADD_PAYMENT_METHOD]
[UPDATE_PAYMENT_METHOD]{"id":"uuid","method_name":"Bank Transfer","is_enabled":true,"instructions":"New instructions"}[/UPDATE_PAYMENT_METHOD]
[DELETE_PAYMENT_METHOD]{"id":"uuid"}[/DELETE_PAYMENT_METHOD]

### Bulk Operations (VERY IMPORTANT — use these for mass changes)
[BULK_UPDATE_PRODUCTS]{"updates":{"currency":"LKR","stock_quantity":100},"filter":"all"}[/BULK_UPDATE_PRODUCTS]
[BULK_UPDATE_SERVICES]{"updates":{"currency":"LKR"},"filter":"all"}[/BULK_UPDATE_SERVICES]
- "updates" contains ALL fields to change — same fields as UPDATE_PRODUCT/UPDATE_SERVICE
- "filter": "all" updates every item. Or use "filter":"available" or "filter":"unavailable"
- Use these for requests like "change currency of all products", "set all stock to 100", "make all services unavailable"
- You can combine with UPDATE_AGENT to change currency everywhere at once

### FAQs & Knowledge Base
[ADD_FAQ]{"question":"Q","answer":"A","linked_product_id":"product-or-service-uuid"}[/ADD_FAQ]
- When an FAQ belongs to a specific product or service, include linked_product_id using the matching item ID from the dashboard data.

### Knowledge Base & Meta
[ADD_CAPABILITY]{"capability":"text"}[/ADD_CAPABILITY]
[ADD_RULE]{"rule":"text"}[/ADD_RULE]
[UPDATE_BUSINESS]{"businessHours":"Mon-Fri 9-5","contactInfo":"email@example.com"}[/UPDATE_BUSINESS]

### Document Templates
[ADD_DOCUMENT_TEMPLATE]{"name":"Invoice","template_type":"invoice","description":"Desc","business_info":{"company_name":"Biz"},"content_sections":[],"styling":{}}[/ADD_DOCUMENT_TEMPLATE]
[DELETE_DOCUMENT_TEMPLATE]{"id":"uuid"}[/DELETE_DOCUMENT_TEMPLATE]

### Web Scraping
[SCRAPE_URL]{"url":"https://example.com"}[/SCRAPE_URL]

## GUIDELINES
- For variants: [{"name":"Color","options":[{"value":"Red","price_modifier":0}]}]
- Always confirm before destructive actions (delete, status changes)
- After any action, show a [SUMMARY] of what changed
- You can answer ANY question about the business data — orders, revenue, bookings, inquiries, etc.
- When user asks "how do I...", guide them using the dashboard sections OR offer to do it for them
- Be concise and practical
- **BULK OPERATIONS**: When the user asks to change something across ALL products/services (e.g. "change currency to LKR", "set all stock to 100", "disable all products"), use BULK_UPDATE_PRODUCTS/BULK_UPDATE_SERVICES markers. Also use UPDATE_AGENT for agent-level settings like default_currency.
- **CURRENCY CHANGES**: When user asks to change currency, emit UPDATE_AGENT to change the default currency. Then ONLY emit BULK_UPDATE_PRODUCTS if the agent has products, and ONLY emit BULK_UPDATE_SERVICES if the agent has services. Check the CURRENT AGENT STATE above to see which items exist. Do NOT emit bulk update markers for item types that don't exist — it creates unnecessary noise.

## DOCUMENT & IMAGE ANALYSIS

When the user uploads a document or image:
1. **Analyze ALL content** — extract products, services, prices, contacts
2. **Present structured summary** of findings
3. **After confirmation, use action markers** to add items
4. If unclear, ask for clarification`;

export default function FloatingConfigBot({ agent, onAgentUpdated }: Props) {
  const [isOpen, setIsOpen] = useState(() => {
    const opened = sessionStorage.getItem("mgt_assistant_opened");
    if (!opened) {
      sessionStorage.setItem("mgt_assistant_opened", "true");
      return true;
    }
    return false;
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const sendVoiceRef = useRef<(text: string) => void>(() => {});
  const { isRecording, isTranscribing, toggleRecording } = useVoiceInput({
    onTranscript: (text) => sendVoiceRef.current(text),
    disabled: isLoading,
  });
  const { voiceMode, toggleVoiceMode, speak, isSpeaking } = useTextToSpeech();
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingAttachments, setPendingAttachments] = useState<{ type: AttachmentType; url: string; name: string; extractedText?: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [triageImage, setTriageImage] = useState<{ url: string; name: string } | null>(null);
   const [waPhoneNumber, setWaPhoneNumber] = useState<string | null>(null);
   const [showWaDialog, setShowWaDialog] = useState(false);
   const navigate = useNavigate();

  // Draggable FAB state
  const [fabPos, setFabPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number; dragged: boolean } | null>(null);

  const getFabDefault = useCallback(() => ({
    x: window.innerWidth - 72,
    y: window.innerHeight - 136,
  }), []);

  const clampPos = useCallback((x: number, y: number) => ({
    x: Math.max(8, Math.min(x, window.innerWidth - 64)),
    y: Math.max(8, Math.min(y, window.innerHeight - 64)),
  }), []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const pos = fabPos || getFabDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: pos.x, startPosY: pos.y, dragged: false };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [fabPos, getFabDefault]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragRef.current.dragged = true;
    if (dragRef.current.dragged) {
      setFabPos(clampPos(dragRef.current.startPosX + dx, dragRef.current.startPosY + dy));
    }
  }, [clampPos]);

  const handlePointerUp = useCallback(() => {
    const wasDrag = dragRef.current?.dragged;
    dragRef.current = null;
    if (!wasDrag) setIsOpen(true);
  }, []);

  const voiceCallSendRef = useRef<(text: string) => Promise<string>>(async () => "");

  const getAccessToken = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      throw new Error("Please sign in again to use the management assistant.");
    }

    return accessToken;
  }, []);

  // Load history on mount
  useEffect(() => {
    const history = loadHistory(agent.id);
    if (history.length > 0) setMessages(history);
  }, [agent.id]);

  // Fetch WhatsApp session phone number
  useEffect(() => {
    const fetchWaNumber = async () => {
      const { data } = await supabase
        .from("whatsapp_sessions")
        .select("phone_number, status")
        .eq("agent_id", agent.id)
        .eq("status", "connected")
        .maybeSingle();
      setWaPhoneNumber(data?.phone_number || null);
    };
    fetchWaNumber();
  }, [agent.id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Listen for open-management-assistant event from other components
  useEffect(() => {
    const handler = () => setIsOpen(true);
    document.addEventListener("open-management-assistant", handler);
    return () => document.removeEventListener("open-management-assistant", handler);
  }, []);

  const processScrapeActions = useCallback(async (text: string): Promise<{cleaned: string; scrapeResults: string[]}> => {
    const scrapeResults: string[] = [];
    const regex = /\[SCRAPE_URL\](.*?)\[\/SCRAPE_URL\]/gs;
    let match;
    while ((match = regex.exec(text)) !== null) {
      try {
        const data = JSON.parse(match[1]);
        toast({ title: "🌐 Scraping website...", description: data.url });
        const result = await scrapeWebsite(data.url);
        if (result.success && result.data?.markdown) {
          scrapeResults.push(`Website scraped successfully (${result.data.metadata?.title || data.url}):\n${result.data.markdown.slice(0, 6000)}`);
          toast({ title: "✅ Website scraped!", description: result.data.metadata?.title || data.url });
        } else {
          scrapeResults.push(`Failed to scrape ${data.url}: ${result.error || "Unknown error"}`);
          toast({ title: "Scrape failed", description: result.error, variant: "destructive" });
        }
      } catch (e: any) {
        scrapeResults.push(`Failed to scrape: ${e.message}`);
      }
    }
    const cleaned = text.replace(/\[SCRAPE_URL\].*?\[\/SCRAPE_URL\]/gs, "").trim();
    return { cleaned, scrapeResults };
  }, []);

  const processActions = useCallback(async (text: string) => {
    const parseMarkerPayload = (raw: string) => {
      let normalized = raw
        .trim()
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/,\s*([}\]])/g, "$1");

      // Find JSON boundaries
      const start = normalized.indexOf("{");
      const arrStart = normalized.indexOf("[");
      const useArr = arrStart !== -1 && (start === -1 || arrStart < start);
      const jsonStart = useArr ? arrStart : start;
      const jsonEnd = normalized.lastIndexOf(useArr ? "]" : "}");

      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        normalized = normalized.slice(jsonStart, jsonEnd + 1);
      }

      // Remove control characters but preserve valid unicode (emojis etc)
      normalized = normalized.replace(/[\x00-\x1F\x7F]/g, (ch) =>
        ch === "\n" || ch === "\r" || ch === "\t" ? " " : ""
      );

      try {
        return JSON.parse(normalized);
      } catch (e1) {
        // Try to fix unescaped characters inside string values by re-encoding
        // Remove trailing commas again after cleanup
        normalized = normalized.replace(/,\s*([}\]])/g, "$1");
        try {
          return JSON.parse(normalized);
        } catch {
          // Last resort: try to extract key-value pairs for simple objects
          throw new Error(`Invalid action payload: ${(e1 as Error).message}`);
        }
      }
    };

    const buildProductUpdates = (data: any) => {
      const updates: any = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.price !== undefined) updates.price = data.price;
      if (data.currency !== undefined) updates.currency = data.currency;
      if (data.default_currency !== undefined) updates.currency = data.default_currency;
      if (data.description !== undefined) updates.description = data.description;
      if (data.category !== undefined) updates.category = data.category;
      if (data.is_available !== undefined) updates.is_available = data.is_available;
      if (data.stock_quantity !== undefined) updates.stock_quantity = data.stock_quantity;
      if (data.variants !== undefined) updates.variants = data.variants;
      if (data.image_url !== undefined) updates.image_url = data.image_url;
      if (data.media_urls !== undefined) updates.media_urls = data.media_urls;
      if (data.metadata !== undefined) updates.metadata = data.metadata;
      return updates;
    };

    const buildServiceUpdates = (data: any) => {
      const updates: any = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.price !== undefined) updates.price = data.price;
      if (data.currency !== undefined) updates.currency = data.currency;
      if (data.default_currency !== undefined) updates.currency = data.default_currency;
      if (data.duration_minutes !== undefined) updates.duration_minutes = data.duration_minutes;
      if (data.description !== undefined) updates.description = data.description;
      if (data.category !== undefined) updates.category = data.category;
      if (data.is_available !== undefined) updates.is_available = data.is_available;
      if (data.variants !== undefined) updates.variants = data.variants;
      if (data.image_url !== undefined) updates.image_url = data.image_url;
      if (data.metadata !== undefined) updates.metadata = data.metadata;
      return updates;
    };

    const runBulkProductUpdate = async (data: any) => {
      const sourceUpdates = data?.updates && typeof data.updates === "object" ? data.updates : data;
      const updates = buildProductUpdates(sourceUpdates);
      if (Object.keys(updates).length === 0) {
        throw new Error("No valid fields provided for bulk product update");
      }

      let query = supabase
        .from("products")
        .update(updates)
        .eq("agent_id", agent.id)
        .select("id");

      if (data.filter === "available") query = query.eq("is_available", true);
      if (data.filter === "unavailable") query = query.eq("is_available", false);

      const { data: updatedRows, error } = await query;
      if (error) throw error;
      const changed = updatedRows?.length ?? 0;
      if (changed === 0) return `ℹ️ No products found to update (agent has no products yet)`;
      return `✅ Updated ${changed} product(s)`;
    };

    const runBulkServiceUpdate = async (data: any) => {
      const sourceUpdates = data?.updates && typeof data.updates === "object" ? data.updates : data;
      const updates = buildServiceUpdates(sourceUpdates);
      if (Object.keys(updates).length === 0) {
        throw new Error("No valid fields provided for bulk service update");
      }

      let query = supabase
        .from("services")
        .update(updates)
        .eq("agent_id", agent.id)
        .select("id");

      if (data.filter === "available") query = query.eq("is_available", true);
      if (data.filter === "unavailable") query = query.eq("is_available", false);

      const { data: updatedRows, error } = await query;
      if (error) throw error;
      const changed = updatedRows?.length ?? 0;
      if (changed === 0) return `ℹ️ No services found to update (agent has no services yet)`;
      return `✅ Updated ${changed} service(s)`;
    };

    const resolveLinkedItemId = async (data: any) => {
      const directId = [data.linked_product_id, data.linked_item_id, data.product_id, data.service_id]
        .find((value) => typeof value === "string" && value.trim().length > 0);
      if (directId) return directId.trim();

      const linkedName = [
        data.linked_product_name,
        data.linked_item_name,
        data.product_name,
        data.service_name,
        data.product,
        data.service,
      ].find((value) => typeof value === "string" && value.trim().length > 0);

      if (!linkedName) return null;

      const normalizedName = linkedName.trim().toLowerCase();
      const [productsLookup, servicesLookup] = await Promise.all([
        supabase.from("products").select("id, name").eq("agent_id", agent.id),
        supabase.from("services").select("id, name").eq("agent_id", agent.id),
      ]);

      const catalogItems = [...(productsLookup.data || []), ...(servicesLookup.data || [])];
      const exactMatch = catalogItems.find((item) => item.name.trim().toLowerCase() === normalizedName);
      if (exactMatch) return exactMatch.id;

      const fuzzyMatch = catalogItems.find((item) => {
        const itemName = item.name.trim().toLowerCase();
        return itemName.includes(normalizedName) || normalizedName.includes(itemName);
      });

      return fuzzyMatch?.id ?? null;
    };

    const actions = [
      {
        marker: "ADD_PRODUCT",
        handler: async (data: any) => {
          const { error } = await supabase.from("products").insert({
            agent_id: agent.id,
            name: data.name,
            price: data.price || 0,
            currency: data.currency || data.default_currency || agent.default_currency || "USD",
            description: data.description || null,
            category: data.category || null,
            stock_quantity: data.stock_quantity ?? null,
            variants: data.variants || [],
            metadata: data.metadata || {},
          } as any);
          if (error) throw error;
          return `✅ Product "${data.name}" added`;
        },
      },
      {
        marker: "UPDATE_PRODUCT",
        handler: async (data: any) => {
          const updates = buildProductUpdates(data);
          if (Object.keys(updates).length === 0) throw new Error("No valid product fields to update");

          const { data: updatedRows, error } = await supabase
            .from("products")
            .update(updates)
            .eq("id", data.id)
            .eq("agent_id", agent.id)
            .select("id");
          if (error) throw error;
          if (!updatedRows?.length) throw new Error("Product not found or not allowed");
          return `✅ Product updated`;
        },
      },
      {
        marker: "ADD_SERVICE",
        handler: async (data: any) => {
          const { error } = await supabase.from("services").insert({
            agent_id: agent.id,
            name: data.name,
            price: data.price || 0,
            currency: data.currency || data.default_currency || agent.default_currency || "USD",
            duration_minutes: data.duration_minutes || 30,
            description: data.description || null,
            category: data.category || null,
            variants: data.variants || [],
            metadata: data.metadata || {},
          } as any);
          if (error) throw error;
          return `✅ Service "${data.name}" added`;
        },
      },
      {
        marker: "UPDATE_SERVICE",
        handler: async (data: any) => {
          const updates = buildServiceUpdates(data);
          if (Object.keys(updates).length === 0) throw new Error("No valid service fields to update");

          const { data: updatedRows, error } = await supabase
            .from("services")
            .update(updates)
            .eq("id", data.id)
            .eq("agent_id", agent.id)
            .select("id");
          if (error) throw error;
          if (!updatedRows?.length) throw new Error("Service not found or not allowed");
          return `✅ Service updated`;
        },
      },
      {
        marker: "UPDATE_AGENT",
        handler: async (data: any) => {
          const updates: any = {};
          if (data.name !== undefined) updates.name = data.name;
          if (data.welcome_message !== undefined) updates.welcome_message = data.welcome_message;
          if (data.personality !== undefined) updates.personality = data.personality;
          if (data.status !== undefined) updates.status = data.status;
          if (data.default_currency !== undefined) updates.default_currency = data.default_currency;
          if (data.currency !== undefined) updates.default_currency = data.currency;
          if (data.default_language !== undefined) updates.default_language = data.default_language;
          if (data.language !== undefined) updates.default_language = data.language;
          if (Object.keys(updates).length === 0) throw new Error("No valid agent fields to update");

          const { data: updatedAgent, error } = await supabase
            .from("agents")
            .update(updates)
            .eq("id", agent.id)
            .select("id, default_currency")
            .single();
          if (error) throw error;
          if (!updatedAgent?.id) throw new Error("Agent update failed");
          return `✅ Agent settings updated`;
        },
      },
      {
        marker: "UPDATE_ORDER",
        handler: async (data: any) => {
          const updates: any = {};
          if (data.status !== undefined) updates.status = data.status;
          if (data.payment_status !== undefined) updates.payment_status = data.payment_status;
          if (data.notes !== undefined) updates.notes = data.notes;
          const { data: updatedRows, error } = await supabase
            .from("orders")
            .update(updates)
            .eq("id", data.id)
            .eq("agent_id", agent.id)
            .select("id");
          if (error) throw error;
          if (!updatedRows?.length) throw new Error("Order not found or not allowed");
          return `✅ Order updated`;
        },
      },
      {
        marker: "UPDATE_BOOKING",
        handler: async (data: any) => {
          const updates: any = {};
          if (data.status !== undefined) updates.status = data.status;
          if (data.notes !== undefined) updates.notes = data.notes;
          const { data: updatedRows, error } = await supabase
            .from("bookings")
            .update(updates)
            .eq("id", data.id)
            .eq("agent_id", agent.id)
            .select("id");
          if (error) throw error;
          if (!updatedRows?.length) throw new Error("Booking not found or not allowed");
          return `✅ Booking updated`;
        },
      },
      {
        marker: "UPDATE_INQUIRY",
        handler: async (data: any) => {
          const updates: any = {};
          if (data.status !== undefined) updates.status = data.status;
          const { data: updatedRows, error } = await supabase
            .from("inquiries")
            .update(updates)
            .eq("id", data.id)
            .eq("agent_id", agent.id)
            .select("id");
          if (error) throw error;
          if (!updatedRows?.length) throw new Error("Inquiry not found or not allowed");
          return `✅ Inquiry updated`;
        },
      },
      {
        marker: "ADD_AVAILABILITY",
        handler: async (data: any) => {
          const { error } = await supabase.from("agent_availability").insert({
            agent_id: agent.id,
            day_of_week: data.day_of_week,
            start_time: data.start_time,
            end_time: data.end_time,
            slot_duration_minutes: data.slot_duration_minutes || 30,
          });
          if (error) throw error;
          return `✅ Availability added`;
        },
      },
      {
        marker: "UPDATE_AVAILABILITY",
        handler: async (data: any) => {
          const updates: any = {};
          if (data.start_time !== undefined) updates.start_time = data.start_time;
          if (data.end_time !== undefined) updates.end_time = data.end_time;
          if (data.is_available !== undefined) updates.is_available = data.is_available;
          if (data.slot_duration_minutes !== undefined) updates.slot_duration_minutes = data.slot_duration_minutes;
          const { data: updatedRows, error } = await supabase
            .from("agent_availability")
            .update(updates)
            .eq("id", data.id)
            .eq("agent_id", agent.id)
            .select("id");
          if (error) throw error;
          if (!updatedRows?.length) throw new Error("Availability slot not found or not allowed");
          return `✅ Availability updated`;
        },
      },
      {
        marker: "DELETE_AVAILABILITY",
        handler: async (data: any) => {
          const { data: deletedRows, error } = await supabase
            .from("agent_availability")
            .delete()
            .eq("id", data.id)
            .eq("agent_id", agent.id)
            .select("id");
          if (error) throw error;
          if (!deletedRows?.length) throw new Error("Availability slot not found or not allowed");
          return `✅ Availability deleted`;
        },
      },
      {
        marker: "ADD_PAYMENT_METHOD",
        handler: async (data: any) => {
          const { error } = await supabase.from("agent_payment_methods").insert({
            agent_id: agent.id,
            method_name: data.method_name,
            method_type: data.method_type || "cash",
            instructions: data.instructions || null,
          });
          if (error) throw error;
          return `✅ Payment method "${data.method_name}" added`;
        },
      },
      {
        marker: "UPDATE_PAYMENT_METHOD",
        handler: async (data: any) => {
          const updates: any = {};
          if (data.method_name !== undefined) updates.method_name = data.method_name;
          if (data.method_type !== undefined) updates.method_type = data.method_type;
          if (data.is_enabled !== undefined) updates.is_enabled = data.is_enabled;
          if (data.instructions !== undefined) updates.instructions = data.instructions;
          const { data: updatedRows, error } = await supabase
            .from("agent_payment_methods")
            .update(updates)
            .eq("id", data.id)
            .eq("agent_id", agent.id)
            .select("id");
          if (error) throw error;
          if (!updatedRows?.length) throw new Error("Payment method not found or not allowed");
          return `✅ Payment method updated`;
        },
      },
      {
        marker: "DELETE_PAYMENT_METHOD",
        handler: async (data: any) => {
          const { data: deletedRows, error } = await supabase
            .from("agent_payment_methods")
            .delete()
            .eq("id", data.id)
            .eq("agent_id", agent.id)
            .select("id");
          if (error) throw error;
          if (!deletedRows?.length) throw new Error("Payment method not found or not allowed");
          return `✅ Payment method deleted`;
        },
      },
      {
        marker: "DELETE_PRODUCT",
        handler: async (data: any) => {
          const { data: deletedRows, error } = await supabase
            .from("products")
            .delete()
            .eq("id", data.id)
            .eq("agent_id", agent.id)
            .select("id");
          if (error) throw error;
          if (!deletedRows?.length) throw new Error("Product not found or not allowed");
          return `✅ Product deleted`;
        },
      },
      {
        marker: "DELETE_SERVICE",
        handler: async (data: any) => {
          const { data: deletedRows, error } = await supabase
            .from("services")
            .delete()
            .eq("id", data.id)
            .eq("agent_id", agent.id)
            .select("id");
          if (error) throw error;
          if (!deletedRows?.length) throw new Error("Service not found or not allowed");
          return `✅ Service deleted`;
        },
      },
      { marker: "BULK_UPDATE_PRODUCTS", handler: runBulkProductUpdate },
      { marker: "BULK_EDIT_PRODUCTS", handler: runBulkProductUpdate },
      { marker: "BULK_UPDATE_SERVICES", handler: runBulkServiceUpdate },
      { marker: "BULK_EDIT_SERVICES", handler: runBulkServiceUpdate },
      {
        marker: "ADD_CAPABILITY",
        handler: async (data: any) => `✅ Capability "${data.capability}" noted`,
      },
      {
        marker: "ADD_RULE",
        handler: async (data: any) => `✅ Rule "${data.rule}" noted`,
      },
      {
        marker: "ADD_FAQ",
        handler: async (data: any) => {
          const linkedProductId = await resolveLinkedItemId(data);
          const { error } = await supabase.from("faqs").insert({
            agent_id: agent.id,
            question: data.question,
            answer: data.answer,
            linked_product_id: linkedProductId,
            is_active: data.is_active ?? true,
            sort_order: data.sort_order ?? 0,
          });
          if (error) throw error;
          return linkedProductId
            ? `✅ FAQ "${data.question}" added and linked`
            : `✅ FAQ "${data.question}" added`;
        },
      },
      {
        marker: "UPDATE_BUSINESS",
        handler: async () => `✅ Business info updated`,
      },
      {
        marker: "ADD_DOCUMENT_TEMPLATE",
        handler: async (data: any) => {
          const defaultFields = data.template_type === "invoice"
            ? [
              { id: "customer_name", label: "Customer Name", type: "text", required: true },
              { id: "items", label: "Line Items", type: "items", required: true },
              { id: "due_date", label: "Due Date", type: "date", required: false },
              { id: "notes", label: "Notes", type: "textarea", required: false },
            ]
            : data.template_type === "quotation"
              ? [
                { id: "customer_name", label: "Customer Name", type: "text", required: true },
                { id: "items", label: "Line Items", type: "items", required: true },
                { id: "valid_until", label: "Valid Until", type: "date", required: false },
              ]
              : data.template_type === "receipt"
                ? [
                  { id: "customer_name", label: "Customer Name", type: "text", required: true },
                  { id: "items", label: "Line Items", type: "items", required: true },
                  { id: "payment_method", label: "Payment Method", type: "text", required: true },
                ]
                : [];

          const { error } = await supabase.from("document_templates").insert({
            agent_id: agent.id,
            name: data.name,
            template_type: data.template_type || "custom",
            description: data.description || null,
            fields: data.fields || defaultFields,
            content_sections: data.content_sections || [],
            styling: data.styling || {},
            business_info: data.business_info || {},
          });
          if (error) throw error;
          return `✅ Document template "${data.name}" created`;
        },
      },
      {
        marker: "DELETE_DOCUMENT_TEMPLATE",
        handler: async (data: any) => {
          const { data: deletedRows, error } = await supabase
            .from("document_templates")
            .delete()
            .eq("id", data.id)
            .eq("agent_id", agent.id)
            .select("id");
          if (error) throw error;
          if (!deletedRows?.length) throw new Error("Document template not found or not allowed");
          return `✅ Document template deleted`;
        },
      },
    ];

    const MARKER_TO_TASK_KEY: Record<string, string> = {
      ADD_PRODUCT: "add_product", UPDATE_PRODUCT: "update_product", DELETE_PRODUCT: "delete_product",
      ADD_SERVICE: "add_service", UPDATE_SERVICE: "update_service", DELETE_SERVICE: "delete_service",
      UPDATE_AGENT: "update_settings", UPDATE_ORDER: "update_settings", UPDATE_BOOKING: "update_settings",
      UPDATE_INQUIRY: "update_settings", ADD_AVAILABILITY: "update_settings", UPDATE_AVAILABILITY: "update_settings",
      DELETE_AVAILABILITY: "update_settings", ADD_PAYMENT_METHOD: "update_settings", UPDATE_PAYMENT_METHOD: "update_settings",
      DELETE_PAYMENT_METHOD: "update_settings", ADD_FAQ: "add_faq", ADD_CAPABILITY: "update_settings",
      ADD_RULE: "update_settings", UPDATE_BUSINESS: "update_settings", ADD_DOCUMENT_TEMPLATE: "add_product",
      DELETE_DOCUMENT_TEMPLATE: "delete_product",
      BULK_UPDATE_PRODUCTS: "bulk_operation", BULK_EDIT_PRODUCTS: "bulk_operation",
      BULK_UPDATE_SERVICES: "bulk_operation", BULK_EDIT_SERVICES: "bulk_operation",
    };

    const executionResults: string[] = [];
    const executedTaskKeys: string[] = [];
    for (const { marker, handler } of actions) {
      const regex = new RegExp(`\\[${marker}\\](.*?)\\[/${marker}\\]`, "gs");
      let match;
      while ((match = regex.exec(text)) !== null) {
        try {
          const payload = parseMarkerPayload(match[1]);
          const result = await handler(payload);
          executionResults.push(result);
          if (result.startsWith("✅")) {
            executedTaskKeys.push(MARKER_TO_TASK_KEY[marker] || "general_query");
          }
        } catch (e: any) {
          executionResults.push(`❌ ${marker}: ${e.message}`);
        }
      }
    }

    // Deduct AI credits based on actual actions performed
    if (executedTaskKeys.length > 0) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          for (const taskKey of executedTaskKeys) {
            await supabase.rpc("deduct_ai_credits", { _user_id: user.id, _task_key: taskKey });
          }
          console.log(`[AI Credits] Deducted for ${executedTaskKeys.length} action(s):`, executedTaskKeys);
        }
      } catch (e) { console.error("[AI Credits] Deduction error:", e); }
    }

    if (executionResults.length > 0) {
      // Only show toasts for successes and real errors, skip info messages about empty tables
      executionResults.forEach((r) => {
        if (r.startsWith("ℹ️")) return; // Silent skip for "no items found" info
        toast({ title: r.startsWith("✅") ? "Success" : "Error", description: r });
      });
      onAgentUpdated();

      // Determine which tab to navigate to based on the actions performed
      const actionTypes = new Set<string>();
      for (const { marker } of actions) {
        const regex = new RegExp(`\\[${marker}\\]`, "g");
        if (regex.test(text)) actionTypes.add(marker);
      }

      let targetPath = "";
      if (actionTypes.has("ADD_PRODUCT") || actionTypes.has("UPDATE_PRODUCT") || actionTypes.has("DELETE_PRODUCT") || actionTypes.has("BULK_UPDATE_PRODUCTS") || actionTypes.has("BULK_EDIT_PRODUCTS")) {
        targetPath = "/products";
      } else if (actionTypes.has("ADD_SERVICE") || actionTypes.has("UPDATE_SERVICE") || actionTypes.has("DELETE_SERVICE") || actionTypes.has("BULK_UPDATE_SERVICES") || actionTypes.has("BULK_EDIT_SERVICES")) {
        targetPath = "/services";
      } else if (actionTypes.has("UPDATE_ORDER")) {
        targetPath = "/orders";
      } else if (actionTypes.has("UPDATE_BOOKING")) {
        targetPath = "/bookings";
      } else if (actionTypes.has("UPDATE_INQUIRY")) {
        targetPath = "/inquiries";
      } else if (actionTypes.has("ADD_FAQ")) {
        targetPath = "/faqs";
      } else if (actionTypes.has("ADD_AVAILABILITY") || actionTypes.has("UPDATE_AVAILABILITY") || actionTypes.has("DELETE_AVAILABILITY")) {
        targetPath = "/availability";
      } else if (actionTypes.has("ADD_PAYMENT_METHOD") || actionTypes.has("UPDATE_PAYMENT_METHOD") || actionTypes.has("DELETE_PAYMENT_METHOD")) {
        targetPath = "/integrations";
      } else if (actionTypes.has("ADD_DOCUMENT_TEMPLATE") || actionTypes.has("DELETE_DOCUMENT_TEMPLATE")) {
        targetPath = "/settings";
      } else if (actionTypes.has("UPDATE_AGENT")) {
        targetPath = "/settings";
      }

      if (targetPath) {
        window.dispatchEvent(new CustomEvent("bot-action-navigate", { detail: { path: targetPath } }));
      }
    }

    let cleaned = text;
    for (const { marker } of actions) {
      cleaned = cleaned.replace(new RegExp(`\\[${marker}\\].*?\\[/${marker}\\]`, "gs"), "").trim();
    }
    cleaned = cleaned.replace(/\[SCRAPE_URL\].*?\[\/SCRAPE_URL\]/gs, "").trim();

    if (executionResults.length > 0) {
      const visibleResults = executionResults.filter(r => !r.startsWith("ℹ️") && !r.startsWith("❌"));
      if (visibleResults.length > 0) {
        cleaned = `${cleaned}\n\n[SUMMARY]\n${visibleResults.join("\n")}\n[/SUMMARY]`.trim();
      }
    }

    cleaned = stripErrorResults(cleaned);

    return { cleaned, actionCount: executedTaskKeys.length };
  }, [agent.id, agent.default_currency, onAgentUpdated]);

  // Handle meta actions (capabilities, rules, faqs, business info) by updating knowledge_base
  const processMetaActions = useCallback(async (text: string) => {
    const capMatch = text.match(/\[ADD_CAPABILITY\](.*?)\[\/ADD_CAPABILITY\]/s);
    const ruleMatch = text.match(/\[ADD_RULE\](.*?)\[\/ADD_RULE\]/s);
    const faqMatch = text.match(/\[ADD_FAQ\](.*?)\[\/ADD_FAQ\]/s);
    const bizMatch = text.match(/\[UPDATE_BUSINESS\](.*?)\[\/UPDATE_BUSINESS\]/s);

    if (!capMatch && !ruleMatch && !faqMatch && !bizMatch) return;

    // Load current meta
    const { data: agentData } = await supabase.from("agents").select("knowledge_base").eq("id", agent.id).single();
    const kb = agentData?.knowledge_base || "";
    const metaMarker = "---AGENT_META---";
    let meta: any = {};
    const idx = kb.indexOf(metaMarker);
    if (idx !== -1) {
      try { meta = JSON.parse(kb.slice(idx + metaMarker.length).trim()); } catch {}
    }

    if (capMatch) {
      const d = JSON.parse(capMatch[1]);
      meta.capabilities = [...(meta.capabilities || []), d.capability];
    }
    if (ruleMatch) {
      const d = JSON.parse(ruleMatch[1]);
      meta.rules = [...(meta.rules || []), d.rule];
    }
    if (faqMatch) {
      const d = JSON.parse(faqMatch[1]);
      meta.faqs = [...(meta.faqs || []), { question: d.question, answer: d.answer }];
    }
    if (bizMatch) {
      const d = JSON.parse(bizMatch[1]);
      if (d.businessHours) meta.businessHours = d.businessHours;
      if (d.contactInfo) meta.contactInfo = d.contactInfo;
    }

    // Rebuild knowledge base
    let newKb = "";
    if (meta.businessHours) newKb += `Business Hours: ${meta.businessHours}\n\n`;
    if (meta.contactInfo) newKb += `Contact Information: ${meta.contactInfo}\n\n`;
    if (meta.capabilities?.length) newKb += `Capabilities:\n${meta.capabilities.map((c: string) => `- ${c}`).join("\n")}\n\n`;
    if (meta.faqs?.length) {
      newKb += `Frequently Asked Questions:\n`;
      meta.faqs.forEach((f: any) => { newKb += `Q: ${f.question}\nA: ${f.answer}\n\n`; });
    }
    if (meta.rules?.length) newKb += `Rules & Guidelines:\n${meta.rules.map((r: string) => `- ${r}`).join("\n")}\n\n`;
    newKb += `${metaMarker}\n${JSON.stringify(meta)}`;

    // Regenerate system prompt
    const personality = PERSONALITY_LABELS[agent.personality] || agent.personality;
    const agentType = AGENT_TYPE_LABELS[agent.agent_type] || agent.agent_type;
    let prompt = `You are "${agent.name}", a ${personality.toLowerCase()} ${agentType.toLowerCase()} AI assistant.\n\n`;
    if (meta.capabilities?.length) prompt += `Your capabilities:\n${meta.capabilities.map((c: string) => `- ${c}`).join("\n")}\n\n`;
    if (meta.rules?.length) prompt += `Rules you must follow:\n${meta.rules.map((r: string) => `- ${r}`).join("\n")}\n\n`;
    if (meta.faqs?.length) {
      prompt += `When users ask these common questions, use these answers:\n`;
      meta.faqs.forEach((f: any) => { prompt += `Q: ${f.question}\nA: ${f.answer}\n\n`; });
    }
    if (meta.businessHours) prompt += `Business hours: ${meta.businessHours}\n\n`;
    if (meta.contactInfo) prompt += `Contact information: ${meta.contactInfo}\n\n`;

    await supabase.from("agents").update({ knowledge_base: newKb, system_prompt: prompt.trim() }).eq("id", agent.id);
    onAgentUpdated();
  }, [agent, onAgentUpdated]);

  // Voice call handler - defined after processActions/processMetaActions
  voiceCallSendRef.current = async (text: string): Promise<string> => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/configure-agent`;
    const dashboardCtx = await buildDashboardContext(agent);
    const callMessages: Msg[] = [...messages, { role: "user", content: text }];
    const accessToken = await getAccessToken();

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ messages: callMessages, systemPrompt: MANAGE_SYSTEM_PROMPT + dashboardCtx }),
    });
    if (!resp.ok || !resp.body) throw new Error("Failed to connect");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = "", fullResponse = "";
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
        try { const p = JSON.parse(js); const c = p.choices?.[0]?.delta?.content; if (c) fullResponse += c; } catch {}
      }
    }

    await processMetaActions(fullResponse);
    const { cleaned } = await processActions(fullResponse);
    setMessages(prev => {
      const updated = [...prev, { role: "user" as const, content: text }, { role: "assistant" as const, content: cleaned }];
      saveHistory(agent.id, updated);
      return updated;
    });
    // Increment management message counter
    incrementManagementMessages();
    return cleaned;
  };

  const incrementManagementMessages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("management_messages").eq("user_id", user.id).single();
      const current = (profile as any)?.management_messages || 0;
      await supabase.from("profiles").update({ management_messages: current + 1 } as any).eq("user_id", user.id);
    } catch {}
  };

  const voiceCall = useVoiceCall({
    onSendMessage: (text) => voiceCallSendRef.current(text),
  });

  const handleFileUpload = async (files: FileList) => {
    setUploading(true);
    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const isAudio = file.type.startsWith("audio/");
      const isMedia = isImage || isVideo || isAudio;
      const isDoc = !isMedia && isSupportedDocument(file);

      if (!isMedia && !isDoc) {
        toast({ title: "Unsupported file", description: "Upload images, videos, audio, PDFs, or text files.", variant: "destructive" });
        continue;
      }

      // Media files (image/video/audio) → 50MB cap. Documents → 10MB.
      const maxSize = isMedia ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        const limitMb = isMedia ? 50 : 10;
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        const kind = isVideo ? "Video" : isAudio ? "Audio" : isImage ? "Image" : "File";
        toast({
          title: `${kind} is too large`,
          description: `${kind} must be under ${limitMb}MB. This file is ${sizeMb}MB.`,
          variant: "destructive",
        });
        continue;
      }

      // Upload media (image / video / audio) to storage
      if (isMedia) {
        const ext = file.name.split(".").pop() || (isImage ? "png" : isVideo ? "mp4" : "mp3");
        const path = `${agent.id}/management/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("agent-media").upload(path, file, { cacheControl: "3600", upsert: false });
        if (error) {
          const isSizeErr = /exceeded|too large|maximum|size/i.test(error.message);
          toast({
            title: isSizeErr ? `${isVideo ? "Video" : isAudio ? "Audio" : "File"} is too large` : "Upload failed",
            description: isSizeErr ? "File exceeds the 50MB storage limit." : error.message,
            variant: "destructive",
          });
          continue;
        }
        const { data: urlData } = supabase.storage.from("agent-media").getPublicUrl(path);
        const attType: AttachmentType = isImage ? "image" : isVideo ? "video" : "audio";
        setPendingAttachments(prev => [...prev, { type: attType, url: urlData.publicUrl, name: file.name }]);
        // Open triage dialog asking what to do with this media
        setTriageImage({ url: urlData.publicUrl, name: file.name });
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

  const handleTriageChoice = (action: TriageAction) => {
    setTriageImage(null);

    // FAQ media: don't push a long directive into chat. Show a friendly message
    // with a "Go and Add this FAQ" button that navigates to the FAQs section.
    if (action.kind === "create_faq_from_image" || action.kind === "attach_to_faq") {
      // Stash the media URL so the FAQs page could prefill if needed
      try {
        sessionStorage.setItem("pending_faq_media", JSON.stringify({
          url: action.imageUrl,
          name: action.imageName,
          faqId: action.kind === "attach_to_faq" ? action.faqId : null,
        }));
      } catch { /* ignore */ }

      const friendly = action.kind === "create_faq_from_image"
        ? `Got it — I'll set up a new FAQ with this media.\n\n[BUTTONS: Go and Add this FAQ]`
        : `Got it — I'll add this media to "${action.faqQuestion}".\n\n[BUTTONS: Go and Add this FAQ]`;

      setMessages(prev => {
        const next: Msg[] = [...prev, { role: "assistant", content: friendly }];
        saveHistory(agent.id, next);
        return next;
      });
      // Clear the pending attachment — the FAQ tab will handle it from here
      setPendingAttachments([]);
      return;
    }

    // For all other triage actions: send a short user-facing bubble
    // and a hidden directive to the AI.
    let directive = "";
    let friendly = "";
    switch (action.kind) {
      case "attach_to_product":
        friendly = `Attach to product: ${action.productName}`;
        directive = `Attach the uploaded image to the existing product "${action.productName}" (id: ${action.productId}). Use UPDATE_PRODUCT with image_url set to ${action.imageUrl}.`;
        break;
      case "create_product_from_image":
        friendly = `Create a new product from this image`;
        directive = `Look at the uploaded image, identify the product shown, and create a new product for it. Use ADD_PRODUCT and include image_url: ${action.imageUrl}. Ask me for price/details if you cannot infer them.`;
        break;
      case "attach_to_service":
        friendly = `Attach to service: ${action.serviceName}`;
        directive = `Attach the uploaded image to the existing service "${action.serviceName}" (id: ${action.serviceId}). Use UPDATE_SERVICE with image_url set to ${action.imageUrl}.`;
        break;
      case "create_service_from_image":
        friendly = `Create a new service from this image`;
        directive = `Look at the uploaded image, identify the service shown, and create a new service for it. Use ADD_SERVICE and include image_url: ${action.imageUrl}. Ask me for price/duration if needed.`;
        break;
      case "add_to_welcome":
        friendly = `Add this to the welcome sequence`;
        directive = `Add the uploaded image as an item in the welcome sequence. Use ADD_WELCOME_ITEM with item_type "image" and media_url: ${action.imageUrl}.`;
        break;
      case "extract_data":
        friendly = `Extract data from this image`;
        directive = `Carefully read the uploaded image. Extract every piece of useful data (product names, prices, descriptions, contact info). Present a structured summary, then ask me whether to create products/services from it.`;
        break;
      case "send_as_message":
      default:
        return; // keep image attached, no directive
    }

    // Send immediately with hidden directive but friendly visible bubble.
    send(directive, friendly);
  };

  const send = async (overrideText?: string, displayOverride?: string) => {
    const text = overrideText || input.trim();
    if (!text && pendingAttachments.length === 0) return;
    if (isLoading) return;

    // Build message content with attachments context
    let messageContent = text || "";
    const attachments = [...pendingAttachments];

    if (attachments.length > 0) {
      const imageAttachments = attachments.filter(a => a.type === "image");
      const videoAttachments = attachments.filter(a => a.type === "video");
      const audioAttachments = attachments.filter(a => a.type === "audio");
      const fileAttachments = attachments.filter(a => a.type === "file");

      if (imageAttachments.length > 0) {
        messageContent += `\n\n[Attached ${imageAttachments.length} image(s): ${imageAttachments.map(a => a.name).join(", ")}]`;
      }
      if (videoAttachments.length > 0) {
        messageContent += `\n\n[Attached ${videoAttachments.length} video(s): ${videoAttachments.map(a => `${a.name} (${a.url})`).join(", ")}]`;
      }
      if (audioAttachments.length > 0) {
        messageContent += `\n\n[Attached ${audioAttachments.length} audio file(s): ${audioAttachments.map(a => `${a.name} (${a.url})`).join(", ")}]`;
      }
      if (fileAttachments.length > 0) {
        fileAttachments.forEach(a => {
          messageContent += `\n\n--- Content from "${a.name}" ---\n${a.extractedText?.slice(0, 8000) || "(empty)"}`;
        });
      }
    }

    const userMsg: Msg = {
      role: "user",
      content: messageContent,
      displayContent: displayOverride,
      attachments: attachments.map(a => ({ type: a.type, url: a.url, name: a.name })),
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (!overrideText) setInput("");
    setPendingAttachments([]);
    setIsLoading(true);

    try {
      const dashboardCtx = await buildDashboardContext(agent);
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/configure-agent`;
      const accessToken = await getAccessToken();

      // Build messages for AI, including image URLs for vision
      const imageUrls = attachments.filter(a => a.type === "image").map(a => a.url);

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messages: newMessages,
          systemPrompt: MANAGE_SYSTEM_PROMPT + dashboardCtx,
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        }),
      });

      if (!resp.ok || !resp.body) throw new Error("Failed to connect");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullResponse = "";

      const updateAssistant = (content: string) => {
        let visible = stripActionBlocks(content).trim();
        if (!visible && /\[[A-Z_]+/.test(content)) {
          visible = "Working on it...";
        }

        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && prev.length > newMessages.length) {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: visible } : m);
          }
          return [...prev.slice(0, newMessages.length), { role: "assistant", content: visible }];
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

      // Process scrape actions first
      const { cleaned: afterScrape, scrapeResults } = await processScrapeActions(fullResponse);

      // If scraping happened, do a follow-up AI call with scraped content
      if (scrapeResults.length > 0) {
        const scrapeContext = scrapeResults.join("\n\n");
        const followUpMessages: Msg[] = [
          ...newMessages,
          { role: "assistant", content: afterScrape },
          { role: "user", content: `Here is the scraped website content. Use this information to help me configure my agent (add products, services, etc.):\n\n${scrapeContext}` },
        ];

        const followUpResp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            messages: followUpMessages,
            systemPrompt: MANAGE_SYSTEM_PROMPT + dashboardCtx,
            skipCreditCharge: true,
          }),
        });

        if (followUpResp.ok && followUpResp.body) {
          const reader2 = followUpResp.body.getReader();
          const decoder2 = new TextDecoder();
          let buf2 = "";
          let followUpFull = "";

          while (true) {
            const { done, value } = await reader2.read();
            if (done) break;
            buf2 += decoder2.decode(value, { stream: true });
            let idx: number;
            while ((idx = buf2.indexOf("\n")) !== -1) {
              let line = buf2.slice(0, idx);
              buf2 = buf2.slice(idx + 1);
              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (!line.startsWith("data: ")) continue;
              const js = line.slice(6).trim();
              if (js === "[DONE]") break;
              try {
                const p = JSON.parse(js);
                const c = p.choices?.[0]?.delta?.content as string | undefined;
                if (c) {
                  followUpFull += c;
                  updateAssistant(followUpFull);
                }
              } catch { buf2 = line + "\n" + buf2; break; }
            }
          }

          await processMetaActions(followUpFull);
          const { cleaned: followUpCleaned } = await processActions(followUpFull);
          setMessages(prev => {
            const updated = prev.map((m, i) => i === prev.length - 1 && m.role === "assistant" ? { ...m, content: followUpCleaned } : m);
            saveHistory(agent.id, updated);
            return updated;
          });
          if (voiceMode) speak(followUpCleaned);
          incrementManagementMessages();
        }
      } else {
        // Normal flow — no scraping
        await processMetaActions(fullResponse);
        const { cleaned } = await processActions(fullResponse);
        setMessages(prev => {
          const updated = prev.map((m, i) => i === prev.length - 1 && m.role === "assistant" ? { ...m, content: cleaned } : m);
          saveHistory(agent.id, updated);
          return updated;
        });
        if (voiceMode) speak(cleaned);
        incrementManagementMessages();
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  sendVoiceRef.current = (text: string) => send(text);

  const handleButtonAction = useCallback((text: string) => {
    // Intercept FAQ navigation button
    if (/go and add this faq/i.test(text.trim())) {
      navigate("/faqs?action=add");
      return;
    }
    send(text);
  }, [messages, isLoading, navigate]);

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY(agent.id));
    toast({ title: "Chat history cleared" });
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            style={{
              position: "fixed",
              left: (fabPos || getFabDefault()).x,
              top: (fabPos || getFabDefault()).y,
              touchAction: "none",
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="z-50 h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center group cursor-grab active:cursor-grabbing select-none"
          >
            <Sparkles className="h-6 w-6 group-hover:animate-spin pointer-events-none" />
            <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-accent border-2 border-background animate-pulse pointer-events-none" />
            <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping pointer-events-none" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`fixed z-50 border border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl shadow-black/20 flex flex-col overflow-hidden transition-all duration-300 ${
              isFullscreen
                ? "inset-0 rounded-none w-full h-full"
                : "inset-0 sm:inset-auto sm:bottom-20 sm:right-6 sm:w-[400px] sm:h-[560px] sm:max-h-[calc(100vh-120px)] sm:rounded-2xl"
            }`}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3 bg-gradient-to-r from-primary/10 to-transparent">
              <div className="rounded-full bg-gradient-to-br from-primary to-primary/60 p-2">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-sm">Management Assistant</p>
                <p className="text-xs text-muted-foreground truncate">Add products, change settings, manage your agent</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => { setShowVoiceCall(true); voiceCall.startCall(); }}
                  title="Voice Call"
                >
                  <Phone className="h-3.5 w-3.5 text-primary" />
                </Button>
                <VoiceModeToggle voiceMode={voiceMode} onToggle={toggleVoiceMode} isSpeaking={isSpeaking} />
                {messages.length > 0 && (
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={clearHistory} title="Clear history">
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsFullscreen(f => !f)} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
                  {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  className="h-7 hidden sm:flex w-7"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  className="sm:hidden h-7 text-xs px-3 gap-1 bg-primary text-primary-foreground hover:bg-primary/90 animate-glow-pulse"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  Dashboard
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-6">
                  <div className="rounded-full bg-primary/10 p-4 w-fit mx-auto mb-3">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <p className="font-display font-semibold text-sm mb-1">Management Assistant</p>
                  <p className="text-xs text-muted-foreground mb-3 px-4 leading-relaxed">
                    I can help you manage your agent — add products, update settings, view orders, and more. 
                    Just type what you need or pick a suggestion below.
                  </p>

                  {/* WhatsApp Management Button */}
                   <button
                     onClick={() => {
                       if (waPhoneNumber) {
                         const clean = waPhoneNumber.replace(/[^0-9]/g, "");
                         window.open(`https://wa.me/${clean}`, "_blank");
                       } else {
                         setShowWaDialog(true);
                       }
                     }}
                     className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-semibold transition-colors shadow-sm"
                   >
                     <MessageCircle className="h-4 w-4" />
                     {waPhoneNumber ? "Open in WhatsApp" : "Connect WhatsApp"}
                   </button>

                   <Dialog open={showWaDialog} onOpenChange={setShowWaDialog}>
                     <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                       <DialogHeader>
                         <DialogTitle>Connect WhatsApp</DialogTitle>
                       </DialogHeader>
                       <WhatsAppTab agentId={agent.id} />
                     </DialogContent>
                   </Dialog>

                  <p className="text-xs text-muted-foreground mb-2">Try saying:</p>
                   <div className="space-y-1.5 text-xs text-muted-foreground">
                     {/* Connect WhatsApp suggestion - first for unconnected users */}
                     {!waPhoneNumber && (
                       <button
                         onClick={() => {
                           setShowWaDialog(true);
                         }}
                         className="block w-full text-left px-3 py-1.5 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] font-medium transition-colors border border-[#25D366]/20"
                       >
                         📲 How to connect WhatsApp
                       </button>
                     )}
                     {((): string[] => {
                       const type = agent?.agent_type;
                       const currency = agent?.default_currency || "USD";
                       const common = [
                         "Change the welcome message",
                         `Scrape my website for info`,
                       ];
                       if (type === "order_handler") return [
                         `Add a Red T-Shirt product for 15 ${currency}`,
                         "What products do I have?",
                         "Show recent orders",
                         ...common,
                       ];
                       if (type === "booking_agent") return [
                         `Add a Consultation service for 50 ${currency}`,
                         "Show my upcoming bookings",
                         "Update my availability schedule",
                         ...common,
                       ];
                       if (type === "inquiry_only") return [
                         "Show recent inquiries",
                         "Add a new FAQ",
                         "What collect fields do I have?",
                         ...common,
                       ];
                       if (type === "support_bot") return [
                         "Add a FAQ about refund policy",
                         "What FAQs do I have?",
                         "Show recent conversations",
                         ...common,
                       ];
                       return [
                         "What can you help me with?",
                         "Show my dashboard stats",
                         "Add a new FAQ",
                         ...common,
                       ];
                     })().map((hint, i) => (
                       <button
                         key={i}
                         onClick={() => { setInput(hint); inputRef.current?.focus(); }}
                         className="block w-full text-left px-3 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                       >
                         "{hint}"
                       </button>
                     ))}
                   </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}
                >
                  {msg.role === "assistant" && (
                    <div className="rounded-full bg-gradient-to-br from-primary/20 to-primary/5 p-1.5 h-7 w-7 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                  <div className={`rounded-xl px-3 py-2 max-w-[85%] text-sm ${
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"
                  }`}>
                    {/* Show attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {msg.attachments.map((att, ai) => (
                          att.type === "image" ? (
                            <img key={ai} src={att.url} alt={att.name} className="w-16 h-16 rounded-md object-cover border border-primary-foreground/20" />
                          ) : (
                            <div key={ai} className="flex items-center gap-1 text-xs bg-primary-foreground/10 rounded px-2 py-1">
                              <FileText className="h-3 w-3" />
                              <span className="truncate max-w-[100px]">{att.name}</span>
                            </div>
                          )
                        ))}
                      </div>
                    )}
                    {msg.role === "assistant" ? (
                      <InteractiveChatMessage
                        content={msg.content}
                        onAction={handleButtonAction}
                        isLatest={i === messages.length - 1}
                      />
                    ) : (msg.displayContent ?? msg.content).replace(/\n\n--- Content from ".*?" ---\n[\s\S]*$/g, "").replace(/\n\n\[Attached \d+ (?:image|video|audio).*?\]/g, "").trim() || "📎 Sent attachments"}
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

            {/* Pending Attachments */}
            {pendingAttachments.length > 0 && (
              <div className="px-3 pt-2 flex flex-wrap gap-1.5">
                {pendingAttachments.map((att, i) => (
                  <div key={i} className="relative group">
                    {att.type === "image" ? (
                      <img src={att.url} alt={att.name} className="w-10 h-10 rounded-md object-cover border border-border/50" />
                    ) : att.type === "video" ? (
                      <div className="w-10 h-10 rounded-md border border-border/50 bg-secondary/50 flex items-center justify-center" title={att.name}>
                        <Video className="h-4 w-4 text-primary" />
                      </div>
                    ) : att.type === "audio" ? (
                      <div className="w-10 h-10 rounded-md border border-border/50 bg-secondary/50 flex items-center justify-center" title={att.name}>
                        <FileAudio className="h-4 w-4 text-primary" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-md border border-border/50 bg-secondary/50 flex items-center justify-center" title={att.name}>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <button onClick={() => removeAttachment(i)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="border-t border-border/50 p-3 flex gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*,audio/*,.pdf,.txt,.md,.csv"
                multiple
                className="hidden"
                onChange={(e) => { if (e.target.files?.length) handleFileUpload(e.target.files); e.target.value = ""; }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading || isLoading}
                className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50 shrink-0"
                title="Attach image, video, audio or document"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              </button>
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Ask me anything..."
                disabled={isLoading}
                className="flex-1 text-sm"
              />
              <VoiceButton isRecording={isRecording} isTranscribing={isTranscribing} onClick={toggleRecording} disabled={isLoading} />
              <Button onClick={() => send()} disabled={isLoading || (!input.trim() && pendingAttachments.length === 0)} className="bg-primary hover:bg-primary/90" size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {/* History indicator */}
            {messages.length > 0 && (
              <div className="px-3 pb-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                <History className="h-2.5 w-2.5" />
                {messages.length} messages · history saved
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <VoiceCallModal
        open={showVoiceCall}
        onClose={() => setShowVoiceCall(false)}
        agentName="Management Assistant"
        agentAvatarUrl={agent.avatar_url}
        isListening={voiceCall.isListening}
        isSpeaking={voiceCall.isSpeaking}
        isProcessing={voiceCall.isProcessing}
        captions={voiceCall.captions}
        callDuration={voiceCall.callDuration}
        onEndCall={voiceCall.endCall}
        onToggleMute={voiceCall.toggleMute}
      />

      {triageImage && (
        <ImageTriageDialog
          open={!!triageImage}
          agentId={agent.id}
          imageUrl={triageImage.url}
          imageName={triageImage.name}
          onClose={() => setTriageImage(null)}
          onChoose={handleTriageChoice}
        />
      )}
    </>
  );
}
