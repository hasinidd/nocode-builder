import { useState, useEffect, useMemo } from "react";
import woocommerceLogo from "@/assets/woocommerce-logo.png";
import shopifyLogo from "@/assets/shopify-logo.png";
import whatsappLogo from "@/assets/whatsapp-logo.png";
import googleCalendarIcon from "@/assets/google-calendar.svg";
import stripeLogo from "@/assets/stripe-logo.png";
import buildstartLogo from "@/assets/buildstart-logo.png";
import facebookLogo from "@/assets/facebook-logo.png";
import instagramLogo from "@/assets/instagram-logo.png";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Save, Bot, MessageSquare, Clock, Shield, Zap, Globe,
  HelpCircle, Phone, FileText, Pencil, Check, X, Plus, Trash2,
  BarChart3, Users, Calendar, ShoppingCart, TrendingUp, Eye, Inbox, Briefcase, FilePlus, Settings, LogOut, RefreshCw,
  LayoutDashboard, Package, CircleHelp, Pause, Play, Sparkles, Menu, CreditCard, ChevronLeft, ChevronRight, ArrowRight,
  Bell, ClipboardList, ExternalLink
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import { AGENT_TYPE_LABELS, AGENT_TYPE_ICONS, PERSONALITY_LABELS, LANGUAGE_OPTIONS } from "@/types/agent";
import type { Agent, AgentType } from "@/types/agent";
import WelcomeSequenceEditor from "@/components/WelcomeSequenceEditor";
import AvailabilityTab from "@/components/AvailabilityTab";
import BookingsTab from "@/components/BookingsTab";
import OrdersTab from "@/components/OrdersTab";
import ProductsTab from "@/components/ProductsTab";
import ServicesTab from "@/components/ServicesTab";
import PaymentMethodsSection from "@/components/PaymentMethodsSection";
import InquiriesTab from "@/components/InquiriesTab";
import CollectFieldsSection from "@/components/CollectFieldsSection";
import DocumentTemplatesTab from "@/components/DocumentTemplatesTab";
import FollowUpConfig from "@/components/FollowUpConfig";
import NotificationConfig from "@/components/NotificationConfig";
import { motion } from "framer-motion";
import FloatingConfigBot from "@/components/FloatingConfigBot";
import FAQsTab from "@/components/FAQsTab";
import WhatsAppTab from "@/components/WhatsAppTab";
import ConversationsPanel from "@/components/ConversationsPanel";
import UserBillingSection from "@/components/UserBillingSection";
import { claimPendingAgent } from "@/lib/pendingAgent";

interface AgentMeta {
  capabilities?: string[];
  businessHours?: string;
  faqs?: Array<{ question: string; answer: string }>;
  rules?: string[];
  contactInfo?: string;
}

interface ConversationWithMessages {
  id: string;
  created_at: string;
  session_id: string | null;
  messageCount: number;
  lastMessage?: string;
  lastMessageTime?: string;
}

const sanitizeMeta = (raw: unknown): AgentMeta => {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const capabilities = Array.isArray(source.capabilities)
    ? source.capabilities.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  const rules = Array.isArray(source.rules)
    ? source.rules.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  const faqs = Array.isArray(source.faqs)
    ? source.faqs
        .filter(
          (item): item is { question: string; answer: string } =>
            !!item && typeof item === "object" &&
            typeof (item as { question?: unknown }).question === "string" &&
            typeof (item as { answer?: unknown }).answer === "string",
        )
        .map((item) => ({ question: item.question.trim(), answer: item.answer.trim() }))
        .filter((item) => item.question.length > 0 || item.answer.length > 0)
    : [];
  return {
    capabilities,
    businessHours: typeof source.businessHours === "string" ? source.businessHours : "",
    faqs,
    rules,
    contactInfo: typeof source.contactInfo === "string" ? source.contactInfo : "",
  };
};

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
}

function getNavItems(agentType: AgentType): NavItem[] {
  const items: NavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { id: "conversations", label: "Chats", icon: MessageSquare, path: "/chats" },
  ];

  if (agentType === "order_handler") {
    items.push({ id: "products", label: "Products", icon: Package, path: "/products" });
    items.push({ id: "faqs", label: "FAQs", icon: CircleHelp, path: "/faqs" });
    items.push({ id: "orders", label: "Orders", icon: ShoppingCart, path: "/orders" });
  } else if (agentType === "booking_agent") {
    items.push({ id: "services", label: "Services", icon: Briefcase, path: "/services" });
    items.push({ id: "faqs", label: "FAQs", icon: CircleHelp, path: "/faqs" });
    items.push({ id: "availability", label: "Availability", icon: Calendar, path: "/availability" });
    items.push({ id: "bookings", label: "Bookings", icon: Calendar, path: "/bookings" });
  } else if (agentType === "support_bot" || agentType === "general_chatbot") {
    items.push({ id: "services", label: "Services", icon: Briefcase, path: "/services" });
    items.push({ id: "faqs", label: "FAQs", icon: CircleHelp, path: "/faqs" });
    items.push({ id: "inquiries", label: "Inquiries", icon: Inbox, path: "/inquiries" });
  } else if (agentType === "inquiry_only") {
    items.push({ id: "faqs", label: "FAQs", icon: CircleHelp, path: "/faqs" });
    items.push({ id: "inquiries", label: "Inquiries", icon: Inbox, path: "/inquiries" });
  } else if (agentType === "data_analyst") {
    items.push({ id: "services", label: "Services", icon: Briefcase, path: "/services" });
    items.push({ id: "faqs", label: "FAQs", icon: CircleHelp, path: "/faqs" });
  }

  items.push({ id: "integrations", label: "Integrations", icon: Zap, path: "/integrations" });

  items.push({ id: "account", label: "Account", icon: Users, path: "/account" });

  return items;
}

export default function AgentManage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Derive active section from URL path
  const pathToSection: Record<string, string> = {
    "/dashboard": "dashboard",
    "/chats": "conversations",
    "/products": "products",
    "/services": "services",
    "/orders": "orders",
    "/bookings": "bookings",
    "/availability": "availability",
    "/inquiries": "inquiries",
    "/faqs": "faqs",
    "/integrations": "integrations",
    "/account": "account",
  };
  const activeSection = pathToSection[location.pathname] || "dashboard";

  // Editable fields
  const [name, setName] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [knowledgeBase, setKnowledgeBase] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [defaultLanguage, setDefaultLanguage] = useState("auto");

  // Parsed meta
  const [meta, setMeta] = useState<AgentMeta>({});
  const [editingSection, setEditingSection] = useState<string | null>(null);

  // Editable meta fields
  const [editCapabilities, setEditCapabilities] = useState<string[]>([]);
  const [editHours, setEditHours] = useState("");
  const [editFaqs, setEditFaqs] = useState<Array<{ question: string; answer: string }>>([]);
  const [editRules, setEditRules] = useState<string[]>([]);
  const [editContact, setEditContact] = useState("");

  // Stats
  const [stats, setStats] = useState({ conversations: 0, messages: 0, avgMessages: 0, assistantMessages: 0, managementMessages: 0 });
  const [conversations, setConversations] = useState<ConversationWithMessages[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(false);

  // Auto-fetch user's agent
  useEffect(() => {
    if (!user) return;
    const fetchAgent = async () => {
      const pendingId = localStorage.getItem("pending_built_agent_id");
      const clearOnboardingDraftState = () => {
        localStorage.removeItem("pending_built_agent_id");
        sessionStorage.removeItem("agent_builder_step");
        sessionStorage.removeItem("agent_builder_agent_id");
        sessionStorage.removeItem("agent_builder_type");
        sessionStorage.removeItem("agent_builder_name");
        sessionStorage.removeItem("agent_builder_description");
        sessionStorage.removeItem("agent_builder_website_url");
        sessionStorage.removeItem("agent_builder_scrape_data");
        sessionStorage.removeItem("agent_builder_doc_content");
        sessionStorage.removeItem("agent_builder_doc_name");
        sessionStorage.removeItem("agent_builder_seed_message");
      };
      const { data } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        if (!pendingId || data[0].id === pendingId) clearOnboardingDraftState();
        setAgentId(data[0].id);
        loadAgent(data[0].id);
        loadStats(data[0].id);
        return;
      }
      // Fallback: claim the freshly built agent on the backend before redirecting.
      if (pendingId) {
        const claimedId = await claimPendingAgent({ agentId: pendingId });
        if (claimedId) {
          clearOnboardingDraftState();
          setAgentId(claimedId);
          loadAgent(claimedId);
          loadStats(claimedId);
          return;
        }
      }
      navigate("/setup", { replace: true });
    };
    fetchAgent();
  }, [user]);

  // Listen for bot action navigation events
  useEffect(() => {
    const handleBotNavigate = (e: CustomEvent<{ path: string }>) => {
      navigate(e.detail.path);
    };
    window.addEventListener("bot-action-navigate", handleBotNavigate as EventListener);
    return () => window.removeEventListener("bot-action-navigate", handleBotNavigate as EventListener);
  }, [navigate]);

  // Log page visits
  useEffect(() => {
    if (!user) return;
    import("@/lib/activityLog").then(m => m.logActivity({ action: "page_visited", metadata: { page: activeSection, path: location.pathname } }));
  }, [activeSection, user]);

  useEffect(() => {
    if (activeSection === "conversations" && agentId) loadConversations();
  }, [activeSection]);

  const loadAgent = async (agentId: string) => {
    const { data } = await supabase.from("agents").select("*").eq("id", agentId).single();
    if (data) {
      setAgent(data);
      setName(data.name);
      setWelcomeMessage(data.welcome_message);
      setKnowledgeBase(data.knowledge_base || "");
      setSystemPrompt(data.system_prompt);
      setDefaultLanguage((data as any).default_language || "auto");
      parseMeta(data.knowledge_base || "");
    }
    setLoading(false);
  };

  const loadStats = async (agentId: string) => {
    // Load current agent stats
    const { data: convos } = await supabase.from("conversations").select("id").eq("agent_id", agentId);
    const convoCount = convos?.length || 0;
    let msgCount = 0;
    let assistantMsgCount = 0;
    if (convos && convos.length > 0) {
      const convoIds = convos.map(c => c.id);
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", convoIds);
      msgCount = count || 0;

      const { count: aCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", convoIds)
        .eq("role", "assistant");
      assistantMsgCount = aCount || 0;
    }

    // Load cumulative stats from profile (persisted across reconfigurations)
    let cumConvos = 0, cumMsgs = 0, cumAssistant = 0, managementMsgCount = 0;
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("cumulative_conversations, cumulative_messages, cumulative_assistant_messages, management_messages")
        .eq("user_id", user.id)
        .single();
      if (profile) {
        cumConvos = (profile as any).cumulative_conversations || 0;
        cumMsgs = (profile as any).cumulative_messages || 0;
        cumAssistant = (profile as any).cumulative_assistant_messages || 0;
        managementMsgCount = (profile as any).management_messages || 0;
      }
    }

    const totalConvos = convoCount + cumConvos;
    const totalMsgs = msgCount + cumMsgs;
    const totalAssistant = assistantMsgCount + cumAssistant;

    setStats({
      conversations: totalConvos,
      messages: totalMsgs,
      avgMessages: totalConvos > 0 ? Math.round(totalMsgs / totalConvos) : 0,
      assistantMessages: totalAssistant,
      managementMessages: managementMsgCount,
    });
  };

  const loadConversations = async () => {
    if (!agentId || loadingConvos) return;
    setLoadingConvos(true);
    const { data: convos } = await supabase
      .from("conversations").select("*").eq("agent_id", agentId)
      .order("updated_at", { ascending: false });
    if (convos && convos.length > 0) {
      const convoIds = convos.map(c => c.id);
      const { data: msgs } = await supabase
        .from("messages").select("conversation_id, content, created_at, role")
        .in("conversation_id", convoIds).order("created_at", { ascending: false });
      const msgMap: Record<string, { count: number; last?: string; lastTime?: string }> = {};
      msgs?.forEach(m => {
        if (!msgMap[m.conversation_id]) {
          msgMap[m.conversation_id] = { count: 0, last: m.role === "user" ? m.content : undefined, lastTime: m.created_at };
        }
        msgMap[m.conversation_id].count++;
        if (!msgMap[m.conversation_id].last && m.role === "user") {
          msgMap[m.conversation_id].last = m.content;
        }
      });
      setConversations(convos.map(c => ({
        id: c.id, created_at: c.created_at, session_id: c.session_id,
        messageCount: msgMap[c.id]?.count || 0,
        lastMessage: msgMap[c.id]?.last,
        lastMessageTime: msgMap[c.id]?.lastTime,
      })));
    } else {
      setConversations([]);
    }
    setLoadingConvos(false);
  };

  const parseMeta = (kb: string) => {
    const metaMarker = "---AGENT_META---";
    const metaIndex = kb.indexOf(metaMarker);
    if (metaIndex === -1) {
      const empty = sanitizeMeta({});
      setMeta(empty);
      setEditCapabilities(empty.capabilities || []);
      setEditHours(empty.businessHours || "");
      setEditFaqs(empty.faqs || []);
      setEditRules(empty.rules || []);
      setEditContact(empty.contactInfo || "");
      return;
    }
    try {
      const metaJson = kb.slice(metaIndex + metaMarker.length).trim();
      const parsed = sanitizeMeta(JSON.parse(metaJson));
      setMeta(parsed);
      setEditCapabilities(parsed.capabilities || []);
      setEditHours(parsed.businessHours || "");
      setEditFaqs(parsed.faqs || []);
      setEditRules(parsed.rules || []);
      setEditContact(parsed.contactInfo || "");
    } catch {
      const safeFallback = sanitizeMeta({});
      setMeta(safeFallback);
      setEditCapabilities(safeFallback.capabilities || []);
      setEditHours(safeFallback.businessHours || "");
      setEditFaqs(safeFallback.faqs || []);
      setEditRules(safeFallback.rules || []);
      setEditContact(safeFallback.contactInfo || "");
    }
  };

  const buildKnowledgeBase = (baseMeta: AgentMeta): string => {
    let kb = "";
    if (baseMeta.businessHours) kb += `Business Hours: ${baseMeta.businessHours}\n\n`;
    if (baseMeta.contactInfo) kb += `Contact Information: ${baseMeta.contactInfo}\n\n`;
    if (baseMeta.capabilities && baseMeta.capabilities.length > 0) {
      kb += `Capabilities:\n${baseMeta.capabilities.map(c => `- ${c}`).join("\n")}\n\n`;
    }
    if (baseMeta.faqs && baseMeta.faqs.length > 0) {
      kb += `Frequently Asked Questions:\n`;
      baseMeta.faqs.forEach(f => { kb += `Q: ${f.question}\nA: ${f.answer}\n\n`; });
    }
    if (baseMeta.rules && baseMeta.rules.length > 0) {
      kb += `Rules & Guidelines:\n${baseMeta.rules.map(r => `- ${r}`).join("\n")}\n\n`;
    }
    kb += `---AGENT_META---\n${JSON.stringify(baseMeta)}`;
    return kb;
  };

  const generateSystemPrompt = (agentData: Agent, m: AgentMeta): string => {
    const personality = PERSONALITY_LABELS[agentData.personality] || agentData.personality;
    const agentType = AGENT_TYPE_LABELS[agentData.agent_type] || agentData.agent_type;
    let prompt = `You are "${agentData.name}", a ${personality.toLowerCase()} ${agentType.toLowerCase()} AI assistant.\n\n`;
    if (m.capabilities && m.capabilities.length > 0) {
      prompt += `Your capabilities:\n${m.capabilities.map(c => `- ${c}`).join("\n")}\n\n`;
    }
    if (m.rules && m.rules.length > 0) {
      prompt += `Rules you must follow:\n${m.rules.map(r => `- ${r}`).join("\n")}\n\n`;
    }
    if (m.faqs && m.faqs.length > 0) {
      prompt += `When users ask these common questions, use these answers:\n`;
      m.faqs.forEach(f => { prompt += `Q: ${f.question}\nA: ${f.answer}\n\n`; });
    }
    if (m.businessHours) prompt += `Business hours: ${m.businessHours}\n\n`;
    if (m.contactInfo) prompt += `Contact information: ${m.contactInfo}\n\n`;
    return prompt.trim();
  };

  const saveSection = async (section: string) => {
    if (!agent || !agentId) return;
    setSaving(true);
    try {
      const updatedMeta: AgentMeta = {
        capabilities: editCapabilities, businessHours: editHours,
        faqs: editFaqs, rules: editRules, contactInfo: editContact,
      };
      const newKb = buildKnowledgeBase(updatedMeta);
      const updates: any = {};
      if (section === "name") updates.name = name;
      if (section === "welcome") updates.welcome_message = welcomeMessage;
      if (section === "prompt") updates.system_prompt = systemPrompt;
      if (section === "language") updates.default_language = defaultLanguage;
      const metaSections = ["capabilities", "hours", "faqs", "rules", "contact"];
      if (metaSections.includes(section)) {
        updates.knowledge_base = newKb;
        const newPrompt = generateSystemPrompt(agent, updatedMeta);
        updates.system_prompt = newPrompt;
        setSystemPrompt(newPrompt);
      }
      await supabase.from("agents").update(updates).eq("id", agentId);
      setMeta(updatedMeta);
      setKnowledgeBase(newKb);
      setEditingSection(null);
      toast({ title: "Saved!", description: metaSections.includes(section) ? "System prompt auto-updated." : undefined });
      import("@/lib/activityLog").then(m => m.logActivity({ action: "agent_updated", entityType: "agent", entityId: agentId, metadata: { section } }));
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    if (!agent || !agentId) return;
    const newStatus = agent.status === "active" ? "paused" : "active";
    await supabase.from("agents").update({ status: newStatus }).eq("id", agentId);
    setAgent({ ...agent, status: newStatus });
    toast({ title: newStatus === "active" ? "Agent activated!" : "Agent paused" });
    import("@/lib/activityLog").then(m => m.logActivity({ action: newStatus === "active" ? "agent_activated" : "agent_paused", entityType: "agent", entityId: agentId }));
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Loading...</div>;
  }
  if (!agent) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Agent not found</div>;
  }

  const navItems = getNavItems(agent.agent_type);
  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2.5">
        <img src={buildstartLogo} alt="BuildStart" className="h-10" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { navigate(item.path); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Sign Out */}
      <div className="px-3 pb-3">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>

      {/* Bottom */}
      <div className="px-3 pb-4">
        <p className="text-xs text-muted-foreground/60 text-center">
          Powered by <span className="text-primary font-medium">BuildStart.io</span>
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[250px] border-r border-border/60 flex-col bg-sidebar-background shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar (Sheet) */}
      {isMobile && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-[260px] p-0">
            {sidebarContent}
          </SheetContent>
        </Sheet>
      )}

      {/* Main Content */}
      <main className="flex-1 min-h-screen overflow-auto">
        {/* Mobile Header */}
        {isMobile && (
          <header className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3 border-b border-border/60 bg-background/95 backdrop-blur-sm">
            <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <Menu className="h-5 w-5 text-foreground" />
            </button>
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-base font-bold text-foreground">{navItems.find(n => n.id === activeSection)?.label || "Dashboard"}</span>
          </header>
        )}

        <div className="px-3 py-4 sm:px-4 sm:py-6 md:px-8 md:py-8">
          {activeSection === "dashboard" && (
            <DashboardSection
              agent={agent}
              stats={stats}
              meta={meta}
              id={agentId!}
              toggleStatus={toggleStatus}
              formatDate={formatDate}
            />
          )}

          {activeSection === "conversations" && agentId && (
            <ConversationsPanel agentId={agentId} />
          )}

          {activeSection === "products" && agentId && <ProductsSection agentId={agentId} meta={meta} defaultCurrency={(agent as any).default_currency || "USD"} onCurrencyChanged={() => { loadAgent(agentId!); loadStats(agentId!); }} autoOpen={searchParams.get("action") === "add"} />}
          {activeSection === "services" && agentId && <ServicesSection agentId={agentId} agentType={agent?.agent_type as AgentType} defaultCurrency={(agent as any).default_currency || "USD"} onCurrencyChanged={() => { loadAgent(agentId!); loadStats(agentId!); }} autoOpen={searchParams.get("action") === "add"} />}
          {activeSection === "orders" && agentId && <OrdersSectionView agentId={agentId} defaultCurrency={(agent as any).default_currency || "USD"} autoOpen={searchParams.get("action") === "add"} />}
          {activeSection === "bookings" && agentId && <BookingsSection agentId={agentId} />}
          {activeSection === "availability" && agentId && <AvailabilitySection agentId={agentId} />}
          {activeSection === "inquiries" && agentId && <InquiriesSection agentId={agentId} />}
          {activeSection === "faqs" && agentId && <FAQsTab agentId={agentId} agentType={agent?.agent_type as AgentType} autoOpen={searchParams.get("action") === "add"} />}
          {activeSection === "integrations" && agentId && <IntegrationsPanel agentId={agentId} agentType={agent?.agent_type as AgentType} />}

          {activeSection === "account" && (
            <AccountSection
              user={user}
              signOut={signOut}
              agentId={agentId}
              agent={agent}
              meta={meta}
              editingSection={editingSection}
              setEditingSection={setEditingSection}
              editCapabilities={editCapabilities}
              setEditCapabilities={setEditCapabilities}
              editHours={editHours}
              setEditHours={setEditHours}
              editRules={editRules}
              setEditRules={setEditRules}
              editContact={editContact}
              setEditContact={setEditContact}
              defaultLanguage={defaultLanguage}
              setDefaultLanguage={setDefaultLanguage}
              systemPrompt={systemPrompt}
              setSystemPrompt={setSystemPrompt}
              saving={saving}
              saveSection={saveSection}
            />
          )}
        </div>
      </main>

      {/* Floating Config Bot */}
      {agent && agentId && (
        <FloatingConfigBot agent={agent} onAgentUpdated={() => { loadAgent(agentId!); loadStats(agentId!); }} />
      )}
    </div>
  );
}

/* ==================== INTEGRATIONS PANEL ==================== */
function IntegrationsPanel({ agentId, agentType }: { agentId: string; agentType: AgentType }) {
  const location = useLocation();
  const expandParam = new URLSearchParams(location.search).get("expand") || null;
  const { user } = useAuth();
  const [calendarConnection, setCalendarConnection] = useState<any>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [ownerPhone, setOwnerPhone] = useState("");
  const [savedOwnerPhone, setSavedOwnerPhone] = useState("");
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [botPhoneNumber, setBotPhoneNumber] = useState("");
  const [notifyBookings, setNotifyBookings] = useState(true);
  const [notifyOrders, setNotifyOrders] = useState(true);
  const [notifyInquiries, setNotifyInquiries] = useState(true);

  // WooCommerce state
  const [wooConnection, setWooConnection] = useState<any>(null);
  const [wooLoading, setWooLoading] = useState(false);
  const [wooSyncing, setWooSyncing] = useState(false);
  const [wooForm, setWooForm] = useState({ store_url: "", consumer_key: "", consumer_secret: "" });
  const [showWooForm, setShowWooForm] = useState(false);
  const [showWooManualForm, setShowWooManualForm] = useState(false);
  const [wooAuthLoading, setWooAuthLoading] = useState(false);
  const isWooConnected = !!wooConnection && wooConnection.consumer_key !== "pending_oauth" && wooConnection.consumer_secret !== "pending_oauth";

  // Shopify state
  const [shopifyConnection, setShopifyConnection] = useState<any>(null);
  const [shopifyLoading, setShopifyLoading] = useState(false);
  const [shopifySyncing, setShopifySyncing] = useState(false);
  const [shopifyShopDomain, setShopifyShopDomain] = useState("");
  const [showShopifyForm, setShowShopifyForm] = useState(false);

  // Stripe Connect state
  const [stripeConnection, setStripeConnection] = useState<any>(null);
  const [stripeLoading, setStripeLoading] = useState(false);

  useEffect(() => {
    if (user) loadCalendarConnection();
    loadOwnerPhone();
    loadWooConnection();
    loadShopifyConnection();
    loadStripeConnection();
  }, [user, agentId]);

  const loadOwnerPhone = async () => {
    const { data } = await supabase
      .from("agents")
      .select("owner_whatsapp_number")
      .eq("id", agentId)
      .single();
    const phone = (data as any)?.owner_whatsapp_number || "";
    setOwnerPhone(phone);
    setSavedOwnerPhone(phone);

    // Load bot phone number from connected WhatsApp session
    const { data: waSession } = await supabase
      .from("whatsapp_sessions")
      .select("phone_number")
      .eq("agent_id", agentId)
      .eq("status", "connected")
      .limit(1)
      .maybeSingle();
    if (waSession?.phone_number) setBotPhoneNumber(waSession.phone_number);

    // Load notification preferences
    const { data: agentNotify } = await supabase
      .from("agents")
      .select("notify_bookings, notify_orders, notify_inquiries")
      .eq("id", agentId)
      .single();
    if (agentNotify) {
      setNotifyBookings(agentNotify.notify_bookings ?? true);
      setNotifyOrders(agentNotify.notify_orders ?? true);
      setNotifyInquiries(agentNotify.notify_inquiries ?? true);
    }
  };

  const saveOwnerPhone = async () => {
    setPhoneSaving(true);
    try {
      const cleanPhone = ownerPhone.replace(/\s/g, "").trim();
      const { error } = await supabase
        .from("agents")
        .update({ owner_whatsapp_number: cleanPhone || null } as any)
        .eq("id", agentId);
      if (error) throw error;
      setSavedOwnerPhone(cleanPhone);
      toast({ title: cleanPhone ? "Owner WhatsApp number saved" : "Owner WhatsApp number removed" });

      // Check if WhatsApp bot is connected
      if (cleanPhone && !botPhoneNumber) {
        toast({
          title: "⚠️ WhatsApp not connected yet",
          description: "Your number is saved, but you need to connect WhatsApp first to use the Management Bot. Redirecting...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.history.pushState({}, "", `/account?tab=whatsapp`);
          window.dispatchEvent(new PopStateEvent("popstate"));
        }, 1500);
      } else if (cleanPhone && botPhoneNumber) {
        // Send welcome message via WhatsApp (fire and forget)
        try {
          await supabase.functions.invoke("whatsapp-manage", {
            body: { action: "send_welcome", agent_id: agentId },
          });
          toast({ title: "Welcome message sent!", description: "Check your WhatsApp for the management bot welcome." });
        } catch {
          // Non-blocking - don't show error for welcome message
        }
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setPhoneSaving(false);
    }
  };

  const removeOwnerPhone = async () => {
    setPhoneSaving(true);
    try {
      const { error } = await supabase
        .from("agents")
        .update({ owner_whatsapp_number: null } as any)
        .eq("id", agentId);
      if (error) throw error;
      setOwnerPhone("");
      setSavedOwnerPhone("");
      toast({ title: "Owner WhatsApp number removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setPhoneSaving(false);
    }
  };

  const loadCalendarConnection = async () => {
    try {
      const { data } = await supabase
        .from("google_calendar_connections" as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      setCalendarConnection(data);
    } catch (err) {
      console.error("Failed to load calendar connection:", err);
    }
  };

  const connectGoogleCalendar = async () => {
    setCalendarLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-calendar-auth-url", {
        body: { user_id: user!.id },
      });
      if (error || !data?.auth_url) {
        toast({ title: "Error", description: "Failed to get authorization URL", variant: "destructive" });
        return;
      }
      window.location.href = data.auth_url;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCalendarLoading(false);
    }
  };

  const disconnectGoogleCalendar = async () => {
    setCalendarLoading(true);
    try {
      await supabase
        .from("google_calendar_connections" as any)
        .delete()
        .eq("user_id", user!.id);
      setCalendarConnection(null);
      toast({ title: "Google Calendar disconnected" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCalendarLoading(false);
    }
  };

  // WooCommerce functions
  const loadWooConnection = async () => {
    try {
      const { data } = await supabase
        .from("woocommerce_connections" as any)
        .select("*")
        .eq("agent_id", agentId)
        .maybeSingle();
      setWooConnection(data);
    } catch (err) {
      console.error("Failed to load WooCommerce connection:", err);
    }
  };

  const connectWooCommerceOAuth = async () => {
    if (!wooForm.store_url) {
      toast({ title: "Error", description: "Store URL is required", variant: "destructive" });
      return;
    }
    setWooAuthLoading(true);
    try {
      const cleanUrl = wooForm.store_url.replace(/\/+$/, "").trim();

      const { error: upsertErr } = await supabase.from("woocommerce_connections" as any).upsert({
        agent_id: agentId,
        store_url: cleanUrl,
        consumer_key: "pending_oauth",
        consumer_secret: "pending_oauth",
      }, { onConflict: "agent_id" });
      if (upsertErr) throw upsertErr;

      const { data, error } = await supabase.functions.invoke("woocommerce-auth-url", {
        body: { store_url: cleanUrl, agent_id: agentId, redirect_origin: window.location.origin },
      });
      if (error) throw error;
      if (!data?.auth_url) throw new Error("Failed to generate auth URL");

      window.location.href = data.auth_url;
    } catch (err: any) {
      await supabase.from("woocommerce_connections" as any).delete().eq("agent_id", agentId);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setWooAuthLoading(false);
    }
  };

  const connectWooCommerce = async () => {
    if (!wooForm.store_url || !wooForm.consumer_key || !wooForm.consumer_secret) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" });
      return;
    }
    setWooLoading(true);
    try {
      const cleanUrl = wooForm.store_url.replace(/\/+$/, "").trim();
      const { error } = await supabase.from("woocommerce_connections" as any).insert({
        agent_id: agentId,
        store_url: cleanUrl,
        consumer_key: wooForm.consumer_key.trim(),
        consumer_secret: wooForm.consumer_secret.trim(),
      });
      if (error) throw error;

      const { data: testResult } = await supabase.functions.invoke("woocommerce-sync", {
        body: { action: "test_connection", agent_id: agentId },
      });

      if (testResult?.success) {
        toast({ title: "WooCommerce connected!", description: `Store: ${testResult.store_name || cleanUrl}` });
      } else {
        toast({ title: "Connected but test failed", description: testResult?.error || "Check your credentials", variant: "destructive" });
      }

      setShowWooForm(false);
      setShowWooManualForm(false);
      setWooForm({ store_url: "", consumer_key: "", consumer_secret: "" });
      loadWooConnection();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setWooLoading(false);
    }
  };

  const disconnectWooCommerce = async () => {
    setWooLoading(true);
    try {
      await supabase
        .from("woocommerce_connections" as any)
        .delete()
        .eq("agent_id", agentId);
      setWooConnection(null);
      toast({ title: "WooCommerce disconnected" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setWooLoading(false);
    }
  };

  const syncWooProducts = async () => {
    setWooSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("woocommerce-sync", {
        body: { action: "sync_products", agent_id: agentId },
      });
      if (error) throw error;
      if (data?.success) {
        toast({
          title: "Products synced!",
          description: `Found ${data.total_found} products — ${data.imported} new, ${data.updated} updated`,
        });
        loadWooConnection();
      } else {
        toast({ title: "Sync failed", description: data?.error || "Unknown error", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Sync error", description: err.message, variant: "destructive" });
    } finally {
      setWooSyncing(false);
    }
  };

  const syncWooOrders = async () => {
    setWooSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("woocommerce-sync", {
        body: { action: "sync_orders", agent_id: agentId },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "Orders synced!", description: `${data.synced} orders pushed to WooCommerce` });
      } else {
        toast({ title: "Sync failed", description: data?.error || "Unknown error", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Sync error", description: err.message, variant: "destructive" });
    } finally {
      setWooSyncing(false);
    }
  };

  // Shopify functions
  const loadShopifyConnection = async () => {
    try {
      const { data } = await supabase
        .from("shopify_connections" as any)
        .select("*")
        .eq("agent_id", agentId)
        .maybeSingle();
      setShopifyConnection(data);
    } catch (err) {
      console.error("Failed to load Shopify connection:", err);
    }
  };

  const connectShopify = async () => {
    if (!shopifyShopDomain) {
      toast({ title: "Error", description: "Please enter your store domain", variant: "destructive" });
      return;
    }
    setShopifyLoading(true);
    try {
      let cleanDomain = shopifyShopDomain.replace(/\/+$/, "").replace(/^https?:\/\//, "").trim();
      if (!cleanDomain.includes(".myshopify.com")) {
        cleanDomain = `${cleanDomain}.myshopify.com`;
      }

      const { data, error } = await supabase.functions.invoke("shopify-auth-url", {
        body: { shop: cleanDomain, agent_id: agentId, user_id: user!.id, redirect_origin: window.location.origin },
      });

      if (error || !data?.auth_url) {
        toast({ title: "Error", description: "Failed to get Shopify authorization URL", variant: "destructive" });
        return;
      }

      window.location.href = data.auth_url;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setShopifyLoading(false);
    }
  };

  const disconnectShopify = async () => {
    setShopifyLoading(true);
    try {
      await supabase.from("shopify_connections" as any).delete().eq("agent_id", agentId);
      setShopifyConnection(null);
      toast({ title: "Shopify disconnected" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setShopifyLoading(false);
    }
  };

  const syncShopifyProducts = async () => {
    setShopifySyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("shopify-sync", {
        body: { action: "sync_products", agent_id: agentId },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "Products synced!", description: `Found ${data.total_found} products — ${data.imported} new, ${data.updated} updated` });
        loadShopifyConnection();
      } else {
        toast({ title: "Sync failed", description: data?.error || "Unknown error", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Sync error", description: err.message, variant: "destructive" });
    } finally {
      setShopifySyncing(false);
    }
  };

  const syncShopifyOrders = async () => {
    setShopifySyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("shopify-sync", {
        body: { action: "sync_orders", agent_id: agentId },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "Orders synced!", description: `${data.synced} orders pushed to Shopify` });
      } else {
        toast({ title: "Sync failed", description: data?.error || "Unknown error", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Sync error", description: err.message, variant: "destructive" });
    } finally {
      setShopifySyncing(false);
    }
  };

  // Stripe Connect functions
  const loadStripeConnection = async () => {
    try {
      const { data } = await supabase
        .from("stripe_connections" as any)
        .select("*")
        .eq("agent_id", agentId)
        .maybeSingle();
      setStripeConnection(data);
    } catch (err) {
      console.error("Failed to load Stripe connection:", err);
    }
  };

  const connectStripe = async () => {
    setStripeLoading(true);
    try {
      const redirectUri = `${window.location.origin}/stripe/callback`;
      const { data, error } = await supabase.functions.invoke("stripe-connect-url", {
        body: { agent_id: agentId, redirect_uri: redirectUri },
      });
      if (error || !data?.auth_url) {
        toast({ title: "Error", description: "Failed to get Stripe authorization URL", variant: "destructive" });
        return;
      }
      window.location.href = data.auth_url;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setStripeLoading(false);
    }
  };

  const disconnectStripe = async () => {
    setStripeLoading(true);
    try {
      await supabase.from("stripe_connections" as any).delete().eq("agent_id", agentId);
      setStripeConnection(null);
      toast({ title: "Stripe disconnected" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setStripeLoading(false);
    }
  };

  const [expandedIntegration, setExpandedIntegration] = useState<string | null>(expandParam);

  const toggleIntegration = (id: string) => {
    setExpandedIntegration(prev => prev === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">Integrations</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Connect services to enhance your bot</p>
      </div>

      {/* Integration Logo Buttons Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { id: "woocommerce", label: "WooCommerce", logo: woocommerceLogo, connected: isWooConnected },
          { id: "shopify", label: "Shopify", logo: shopifyLogo, connected: !!shopifyConnection },
          { id: "stripe", label: "Stripe", logo: stripeLogo, connected: !!stripeConnection },
          { id: "whatsapp-mgmt", label: "WhatsApp Management Asst.", logo: whatsappLogo, connected: !!savedOwnerPhone },
          ...(agentType === "booking_agent" ? [{ id: "google-calendar", label: "Google Calendar", logo: googleCalendarIcon, connected: !!calendarConnection }] : []),
        ].map(intg => (
          <button
            key={intg.id}
            onClick={() => toggleIntegration(intg.id)}
            className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all cursor-pointer ${
              expandedIntegration === intg.id
                ? "border-primary bg-primary/5 shadow-sm"
                : intg.connected
                  ? "border-primary/30 bg-primary/5 hover:border-primary/50"
                  : "border-border hover:border-primary/30 hover:bg-secondary/50"
            }`}
          >
            <img src={intg.logo} alt={intg.label} className="h-8 w-8 object-contain" />
            <span className="text-xs font-medium text-foreground">{intg.label}</span>
            {intg.connected && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* WooCommerce Integration */}
      {expandedIntegration === "woocommerce" && (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" /> WooCommerce
          </CardTitle>
          <CardDescription>
            Sync your WooCommerce store products into your bot catalog. Orders placed through the bot can be pushed back to WooCommerce.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isWooConnected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground">
                  Connected to <strong>{wooConnection.store_url}</strong>
                </span>
              </div>
              {wooConnection.last_synced_at && (
                <p className="text-xs text-muted-foreground">
                  Last synced: {new Date(wooConnection.last_synced_at).toLocaleString()}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={syncWooProducts} disabled={wooSyncing} className="gap-2">
                  {wooSyncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
                  Sync Products
                </Button>
                {(agentType === "order_handler") && (
                  <Button size="sm" variant="outline" onClick={syncWooOrders} disabled={wooSyncing} className="gap-2">
                    {wooSyncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                    Push Orders
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnectWooCommerce}
                  disabled={wooLoading}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" /> Disconnect
                </Button>
              </div>
            </div>
          ) : showWooForm ? (
            <div className="space-y-4">
              {!showWooManualForm ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Store URL</Label>
                    <Input
                      placeholder="https://yourstore.com or http://192.168.1.1/wordpress"
                      value={wooForm.store_url}
                      onChange={(e) => setWooForm((f) => ({ ...f, store_url: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter your store URL and click connect. You'll be redirected to your WordPress site to approve the connection automatically — no API keys needed!
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={connectWooCommerceOAuth} disabled={wooAuthLoading} size="sm" className="gap-2">
                      {wooAuthLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                      Connect with WooCommerce
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowWooForm(false)}>
                      Cancel
                    </Button>
                  </div>
                  <button
                    onClick={() => setShowWooManualForm(true)}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Or connect manually with API keys →
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Store URL</Label>
                      <Input
                        placeholder="https://yourstore.com"
                        value={wooForm.store_url}
                        onChange={(e) => setWooForm((f) => ({ ...f, store_url: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Consumer Key</Label>
                      <Input
                        placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        value={wooForm.consumer_key}
                        onChange={(e) => setWooForm((f) => ({ ...f, consumer_key: e.target.value }))}
                        className="mt-1 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Consumer Secret</Label>
                      <Input
                        type="password"
                        placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        value={wooForm.consumer_secret}
                        onChange={(e) => setWooForm((f) => ({ ...f, consumer_secret: e.target.value }))}
                        className="mt-1 font-mono text-xs"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Generate keys from <strong>WooCommerce → Settings → Advanced → REST API → Add Key</strong> with Read/Write permissions.
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={connectWooCommerce} disabled={wooLoading} size="sm" className="gap-2">
                      {wooLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Connect
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setShowWooManualForm(false); setShowWooForm(false); }}>
                      Cancel
                    </Button>
                  </div>
                  <button
                    onClick={() => setShowWooManualForm(false)}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    ← Back to auto-connect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button onClick={() => setShowWooForm(true)} className="gap-2">
              <ShoppingCart className="h-4 w-4" /> Connect WooCommerce Store
            </Button>
          )}
        </CardContent>
      </Card>
      )}

      {/* Shopify Integration */}
      {expandedIntegration === "shopify" && (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" /> Shopify
          </CardTitle>
          <CardDescription>
            Connect your Shopify store with OAuth to sync products into your bot catalog and push bot orders back to Shopify — no manual Admin API token required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {shopifyConnection ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground">
                  Connected to <strong>{shopifyConnection.store_domain}</strong>
                </span>
              </div>
              {shopifyConnection.last_synced_at && (
                <p className="text-xs text-muted-foreground">
                  Last synced: {new Date(shopifyConnection.last_synced_at).toLocaleString()}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={syncShopifyProducts} disabled={shopifySyncing} className="gap-2">
                  {shopifySyncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
                  Sync Products
                </Button>
                {agentType === "order_handler" && (
                  <Button size="sm" variant="outline" onClick={syncShopifyOrders} disabled={shopifySyncing} className="gap-2">
                    {shopifySyncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                    Push Orders
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnectShopify}
                  disabled={shopifyLoading}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" /> Disconnect
                </Button>
              </div>
            </div>
          ) : showShopifyForm ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">OAuth</Badge>
                  <span className="text-sm font-medium text-foreground">Secure Shopify connection</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Enter your <strong>.myshopify.com</strong> store domain and continue in Shopify. No Admin API access token is needed.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Store Domain</Label>
                <Input
                  placeholder="yourstore.myshopify.com"
                  value={shopifyShopDomain}
                  onChange={(e) => setShopifyShopDomain(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">&nbsp;</p>
              </div>

              <div className="flex gap-2">
                <Button onClick={connectShopify} disabled={shopifyLoading} size="sm" className="gap-2">
                  {shopifyLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Continue with Shopify OAuth
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowShopifyForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">OAuth only</Badge>
                  <span className="text-sm text-foreground">No manual API access token required</span>
                </div>
              </div>

              <Button onClick={() => setShowShopifyForm(true)} className="gap-2">
                <Package className="h-4 w-4" /> Connect Shopify with OAuth
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Stripe Connect Integration */}
      {expandedIntegration === "stripe" && (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" /> Stripe Payments
          </CardTitle>
          <CardDescription>
            Connect your Stripe account to automatically send payment links to customers via WhatsApp when they place orders, book appointments, or request services.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stripeConnection ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground">
                  Connected to Stripe account <strong>{stripeConnection.stripe_account_id}</strong>
                </span>
                {stripeConnection.livemode && (
                  <Badge className="bg-primary/10 text-primary text-[10px]">Live</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Payment links will be automatically generated and sent via WhatsApp for products and services with payment links enabled.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={disconnectStripe}
                disabled={stripeLoading}
                className="gap-2 text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4" /> Disconnect
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">OAuth</Badge>
                  <span className="text-sm text-foreground">Secure Stripe Connect</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Connect your existing Stripe account to accept payments. Your customers will pay directly to your Stripe account.
                </p>
              </div>
              <Button onClick={connectStripe} disabled={stripeLoading} className="gap-2">
                {stripeLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Connect with Stripe
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Management Assistant via WhatsApp */}
      {expandedIntegration === "whatsapp-mgmt" && (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" /> Management Assistant via WhatsApp
          </CardTitle>
          <CardDescription>
            Use your registered number to message your WhatsApp AI agent and manage products, orders, and your AI Agent all in one place.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {savedOwnerPhone ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground">
                  Linked to <strong>{savedOwnerPhone}</strong>
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Send a message from this number to your connected WhatsApp bot number to use the Management Assistant.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                {botPhoneNumber ? (
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      const cleanBot = botPhoneNumber.replace(/[^0-9]/g, "");
                      window.open(`https://wa.me/${cleanBot}?text=Hi`, "_blank");
                    }}
                  >
                    <img src={whatsappLogo} alt="WhatsApp" className="h-4 w-4" />
                    Open Management Bot
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 text-destructive border-destructive/30"
                    onClick={() => {
                      const nav = new URLSearchParams(location.search);
                      nav.set("tab", "whatsapp");
                      window.history.pushState({}, "", `/account?${nav.toString()}`);
                      window.dispatchEvent(new PopStateEvent("popstate"));
                    }}
                  >
                    <Phone className="h-4 w-4" />
                    Connect WhatsApp First
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={removeOwnerPhone}
                  disabled={phoneSaving}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" /> Remove Number
                </Button>
              </div>

              {/* Notification Toggles */}
              <Separator />
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Owner Notifications</p>
                <p className="text-xs text-muted-foreground">Receive WhatsApp messages when customers take actions.</p>
                <div className="space-y-2">
                  {[
                    ...(agentType === "booking_agent" ? [
                      { label: "New Bookings", desc: "Get notified when a booking is placed", field: "notify_bookings", value: notifyBookings, setter: setNotifyBookings },
                    ] : []),
                    ...(agentType === "order_handler" ? [
                      { label: "New Orders", desc: "Get notified when an order is created", field: "notify_orders", value: notifyOrders, setter: setNotifyOrders },
                    ] : []),
                    ...((agentType !== "data_analyst") ? [
                      { label: "New Inquiries", desc: "Get notified when customer info is collected", field: "notify_inquiries", value: notifyInquiries, setter: setNotifyInquiries },
                    ] : []),
                  ].map(item => (
                    <div key={item.field} className="flex items-center justify-between py-1">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch
                        checked={item.value}
                        onCheckedChange={async (v) => {
                          item.setter(v);
                          const { error } = await supabase.from("agents").update({ [item.field]: v } as any).eq("id", agentId);
                          if (error) toast({ title: "Failed to update", description: error.message, variant: "destructive" });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Input
                  placeholder="+1234567890"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  className="w-full sm:max-w-xs"
                />
                <Button
                  onClick={saveOwnerPhone}
                  disabled={phoneSaving || !ownerPhone.trim()}
                  size="sm"
                  className="gap-2"
                >
                  {phoneSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your WhatsApp number with country code (e.g. +1234567890). Only this number will have management access.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Google Calendar - only for booking agents */}
      {expandedIntegration === "google-calendar" && agentType === "booking_agent" && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" /> Google Calendar
            </CardTitle>
            <CardDescription>
              Connect your Google Calendar to automatically create events when bookings are placed. Customers will receive email invitations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {calendarConnection ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm text-foreground">
                    Connected to <strong>{calendarConnection.google_email}</strong>
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnectGoogleCalendar}
                  disabled={calendarLoading}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" /> Disconnect
                </Button>
              </div>
            ) : (
              <Button onClick={connectGoogleCalendar} disabled={calendarLoading} className="gap-2">
                {calendarLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                Connect Google Calendar
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getQuickLinks(agentType: AgentType, agentId: string, hasWhatsApp: boolean) {
  const links: Array<{ label: string; icon: React.ElementType; path: string; logoSrc?: string }> = [];

  // WhatsApp connect or status
  if (!hasWhatsApp) {
    links.push({ label: "Connect WhatsApp", icon: Phone, path: "/account?tab=whatsapp", logoSrc: whatsappLogo });
  } else {
    links.push({ label: "WhatsApp Settings", icon: Settings, path: "/account?tab=whatsapp", logoSrc: whatsappLogo });
  }

  // Agent-type specific
  if (agentType === "order_handler") {
    links.push({ label: "Add Order", icon: ShoppingCart, path: "/orders?action=add" });
    links.push({ label: "Add Product", icon: Package, path: "/products?action=add" });
  } else if (agentType === "booking_agent") {
    links.push({ label: "Bookings", icon: Calendar, path: "/bookings" });
    links.push({ label: "Add Service", icon: Briefcase, path: "/services?action=add" });
  } else {
    links.push({ label: "Inquiries", icon: Inbox, path: "/inquiries" });
  }

  // Common
  links.push({ label: "Add FAQ", icon: CircleHelp, path: "/faqs?action=add" });
  links.push({ label: "Welcome Message", icon: Zap, path: "/account?tab=settings&section=welcome" });
  links.push({ label: "Change Language", icon: Globe, path: "/account?tab=settings&section=language" });
  links.push({ label: "Send Invoices", icon: FileText, path: "/account?tab=settings&section=documents" });

  // Advanced / hidden sidebar items
  links.push({ label: "Follow-up Messages", icon: RefreshCw, path: "/account?tab=settings&section=followup" });
  links.push({ label: "Notifications Setup", icon: Bell, path: "/account?tab=settings&section=notifications" });
  links.push({ label: "Collect Fields", icon: ClipboardList, path: "/account?tab=settings&section=collect-fields" });
  links.push({ label: "View Chats", icon: MessageSquare, path: "/conversations" });

  return links;
}

/* ==================== DASHBOARD SECTION ==================== */
function DashboardSection({
  agent, stats, meta, id: agentId, toggleStatus, formatDate
}: {
  agent: Agent; stats: { conversations: number; messages: number; avgMessages: number; assistantMessages: number; managementMessages: number };
  meta: AgentMeta; id: string; toggleStatus: () => void; formatDate: (d: string) => string;
}) {
  const { user } = useAuth();
  const [primaryCount, setPrimaryCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [hasWhatsApp, setHasWhatsApp] = useState(false);

  useEffect(() => {
    const loadPrimaryCount = async () => {
      let table: "orders" | "bookings" | "inquiries" = "inquiries";
      if (agent.agent_type === "order_handler") table = "orders";
      else if (agent.agent_type === "booking_agent") table = "bookings";
      else table = "inquiries";

      const { count } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq("agent_id", agentId);
      setPrimaryCount(count || 0);
    };
    loadPrimaryCount();
  }, [agentId, agent.agent_type]);

  // Check WhatsApp session
  useEffect(() => {
    const checkWA = async () => {
      const { count } = await supabase
        .from("whatsapp_sessions")
        .select("*", { count: "exact", head: true })
        .eq("agent_id", agentId)
        .eq("status", "connected");
      setHasWhatsApp((count || 0) > 0);
    };
    checkWA();
  }, [agentId]);

  // Load total revenue
  useEffect(() => {
    const loadRevenue = async () => {
      const { data: orders } = await supabase.from("orders").select("total").eq("agent_id", agentId);
      setTotalRevenue((orders || []).reduce((sum, o) => sum + (Number(o.total) || 0), 0));
    };
    loadRevenue();
  }, [agentId]);

  const primaryLabel = agent.agent_type === "order_handler"
    ? "Total Orders"
    : agent.agent_type === "booking_agent"
      ? "Total Bookings"
      : "Total Inquiries";
  const primaryIcon = agent.agent_type === "order_handler"
    ? ShoppingCart
    : agent.agent_type === "booking_agent"
      ? Calendar
      : Inbox;

  const defaultCurrency = (agent as any).default_currency || "USD";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Overview of your {agent.name} chatbot</p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <Button
            variant={agent.status === "active" ? "outline" : "default"}
            size="sm"
            onClick={toggleStatus}
            className="gap-1 sm:gap-2 h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3"
          >
            {agent.status === "active" ? (
              <><Pause className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">Pause Bot</span><span className="sm:hidden">Pause</span></>
            ) : (
              <><Play className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">Activate Bot</span><span className="sm:hidden">Activate</span></>
            )}
          </Button>
          <Link to={`/agents/${agentId}/chat`}>
            <Button size="sm" className="gap-1 sm:gap-2 h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3">
              <MessageSquare className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">Test Chat</span><span className="sm:hidden">Test</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat Cards - 3 cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { label: primaryLabel, value: primaryCount.toString(), icon: primaryIcon, color: "text-primary" },
          { label: "Total Conversations", value: stats.conversations.toString(), icon: MessageSquare, color: "text-primary" },
          { label: "Total Revenue", value: `${defaultCurrency} ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`, icon: TrendingUp, color: "text-primary" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-border/50">
              <CardContent className="p-2.5 sm:p-5">
                <div className="flex items-center justify-between mb-1.5 sm:mb-3">
                  <p className="text-[10px] sm:text-sm text-muted-foreground truncate">{s.label}</p>
                  <s.icon className={`h-3 w-3 sm:h-4 sm:w-4 ${s.color} shrink-0`} />
                </div>
                <p className="text-lg sm:text-3xl font-display font-bold text-foreground truncate">{s.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Links - Both mobile and desktop */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
          {getQuickLinks(agent.agent_type as AgentType, agentId, hasWhatsApp).map((ql, i) => (
            <Link key={i} to={ql.path}>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 sm:gap-2 h-10 sm:h-11 text-[10px] sm:text-xs border border-border flex-col sm:flex-row px-1.5 sm:px-3"
              >
                {ql.logoSrc ? (
                  <img src={ql.logoSrc} alt="" className="h-4 w-4 shrink-0" />
                ) : (
                  <ql.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                )}
                <span className="truncate leading-tight text-center sm:text-left">{ql.label}</span>
              </Button>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Feature Slideshow */}
      <FeatureSlideshow agentType={agent.agent_type as AgentType} />
    </div>
  );
}



interface FeatureSlide {
  icon: React.ElementType;
  logos?: string[];
  title: string;
  desc: string;
  path: string;
  color: string;
  howTo: string;
}

function FeatureSlideshow({ agentType }: { agentType: AgentType }) {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [overlaySlide, setOverlaySlide] = useState<FeatureSlide | null>(null);

  const slides: FeatureSlide[] = (() => {
    const common: FeatureSlide[] = [
      { icon: MessageSquare, title: "Live Conversations", desc: "View and manage all customer chats in real-time", path: "/chats", color: "from-blue-500/20 to-blue-600/10", howTo: "Go to Chats to see every conversation your bot is having. You can read messages, jump in to reply manually, pause the bot for a specific chat, or let it handle everything automatically." },
      { icon: CircleHelp, title: "FAQs & Knowledge", desc: "Train your bot with FAQs so it answers accurately", path: "/faqs", color: "from-amber-500/20 to-amber-600/10", howTo: "Navigate to FAQs and add question-answer pairs. Your bot will use these to respond accurately. You can link FAQs to specific products or services for context-aware answers." },
      { icon: Phone, title: "WhatsApp Channel", desc: "Connect your WhatsApp number and let customers chat with your bot", path: "/whatsapp", color: "from-green-500/20 to-green-600/10", logos: [whatsappLogo], howTo: "Go to WhatsApp, scan the QR code with your phone to connect your number. Once connected, customers can message your WhatsApp and the bot will respond automatically 24/7." },
      { icon: Sparkles, title: "WhatsApp Management", desc: "Manage your entire business from WhatsApp — no dashboard needed!", path: "/whatsapp", color: "from-emerald-500/20 to-emerald-600/10", logos: [whatsappLogo], howTo: "After connecting WhatsApp, set your Owner Number in settings. Then simply message your own bot from that number to enter Management Mode — add products, check orders, update FAQs, and manage everything via chat without ever opening the dashboard!" },
      { icon: Zap, title: "Integrations Hub", desc: "Connect Stripe, Shopify, WooCommerce & Google Calendar", path: "/integrations", color: "from-purple-500/20 to-purple-600/10", logos: [stripeLogo, shopifyLogo, woocommerceLogo, googleCalendarIcon], howTo: "Go to Integrations to connect external services. Link Stripe for payments, Shopify/WooCommerce to sync products and orders, or Google Calendar for booking sync. Each integration has a simple setup flow." },
      { icon: RefreshCw, title: "Auto Follow-ups", desc: "Send automated follow-up messages to unresponsive leads", path: "/settings", color: "from-pink-500/20 to-pink-600/10", howTo: "In Settings, find the Follow-up section. Enable auto follow-ups, set the time interval, max retries, and customize the message template. The bot will automatically re-engage customers who haven't responded." },
      { icon: FileText, title: "Document Generation", desc: "Auto-generate invoices, quotes, and custom documents", path: "/settings", color: "from-rose-500/20 to-rose-600/10", howTo: "Go to Settings > Documents to create templates for invoices, receipts, or quotes. Define fields, styling, and business info. Your bot can auto-generate these documents during conversations." },
      { icon: CreditCard, title: "Billing & Plans", desc: "Manage your subscription, AI credits, and add-ons", path: "/billing", color: "from-emerald-500/20 to-emerald-600/10", howTo: "Visit Billing to view your current plan, remaining AI credits, and purchase add-ons. You can upgrade or downgrade your plan and manage payment methods." },
      { icon: Globe, title: "Shareable Chat Link", desc: "Share your bot's unique link with customers anywhere", path: "/settings", color: "from-cyan-500/20 to-cyan-600/10", logos: [facebookLogo, instagramLogo, whatsappLogo], howTo: "In Settings, find your unique chat link and QR code. Share this link on social media, your website, or print the QR code. Anyone who opens it can chat with your bot instantly." },
      { icon: Settings, title: "Bot Settings", desc: "Customize personality, language, prompts and more", path: "/settings", color: "from-slate-500/20 to-slate-600/10", howTo: "Go to Settings to change your bot's name, personality (professional/friendly/casual), default language, system prompt, welcome message sequence, and other configurations." },
    ];

    if (agentType === "order_handler") {
      return [
        { icon: Package, title: "Product Catalog", desc: "Add and manage your products with pricing, variants and stock", path: "/products", color: "from-primary/20 to-primary/10", howTo: "Go to Products to add your items. Set names, prices, descriptions, images, variants (like sizes/colors), and stock quantities. Your bot will use this catalog to help customers browse and order." },
        { icon: ShoppingCart, title: "Orders Dashboard", desc: "Track orders, payments, delivery status and revenue", path: "/orders", color: "from-orange-500/20 to-orange-600/10", howTo: "Visit Orders to see all customer orders. Update statuses (pending → confirmed → delivered), view payment details, customer info, and order items. Filter and search to find specific orders quickly." },
        { icon: Eye, title: "Payment Links", desc: "Generate Stripe payment links for seamless checkout", path: "/integrations", color: "from-indigo-500/20 to-indigo-600/10", logos: [stripeLogo], howTo: "Connect Stripe in Integrations, then enable payment links on products. Your bot will automatically send customers a secure Stripe checkout link during the ordering flow." },
        ...common,
      ];
    }
    if (agentType === "booking_agent") {
      return [
        { icon: Briefcase, title: "Services Catalog", desc: "Define your services with pricing, duration and variants", path: "/services", color: "from-primary/20 to-primary/10", howTo: "Go to Services to add what you offer. Set name, price, duration, description and variants. Your bot will present these to customers and allow them to book directly." },
        { icon: Calendar, title: "Bookings Manager", desc: "View and manage all scheduled appointments", path: "/bookings", color: "from-orange-500/20 to-orange-600/10", logos: [googleCalendarIcon], howTo: "Visit Bookings to see all appointments. Confirm, reschedule, or cancel bookings. View customer details and notes. Calendar sync keeps everything up to date." },
        { icon: Clock, title: "Availability Schedule", desc: "Set your working hours, blocked slots and time zones", path: "/availability", color: "from-teal-500/20 to-teal-600/10", howTo: "Go to Availability to set your working hours for each day of the week. Block specific dates or time slots. Your bot will only offer available times when customers try to book." },
        ...common,
      ];
    }
    if (agentType === "inquiry_only") {
      return [
        { icon: Inbox, title: "Inquiries Dashboard", desc: "View, filter and manage all customer inquiries", path: "/inquiries", color: "from-primary/20 to-primary/10", howTo: "Go to Inquiries to see all submitted forms and questions. Filter by status, update them, and view collected customer data. Each inquiry includes the full conversation context." },
        { icon: Shield, title: "Collect Fields", desc: "Define custom fields to capture structured data from customers", path: "/settings", color: "from-teal-500/20 to-teal-600/10", howTo: "In Settings, define custom fields (name, email, phone, etc.) that your bot should collect from customers. Set which are required. The bot will naturally ask for this info during the chat." },
        ...common,
      ];
    }
    if (agentType === "data_analyst") {
      return [
        { icon: BarChart3, title: "Analytics & Insights", desc: "Get AI-powered analysis and reports from your data", path: "/chats", color: "from-primary/20 to-primary/10", howTo: "Start a conversation with your data analyst bot. Upload data or ask questions — it will analyze, generate insights, and create visual reports to help you make decisions." },
        { icon: Briefcase, title: "Services", desc: "Define analysis services you offer", path: "/services", color: "from-orange-500/20 to-orange-600/10", howTo: "Go to Services to define the types of analysis you offer. This helps the bot understand what it should focus on and present to customers." },
        ...common,
      ];
    }
    return [
      { icon: Briefcase, title: "Services", desc: "Define your services with pricing and details", path: "/services", color: "from-primary/20 to-primary/10", howTo: "Go to Services to add your offerings with pricing, descriptions, and images. Your bot will use this to inform customers about what you provide." },
      { icon: Inbox, title: "Inquiries", desc: "View and manage all customer inquiries", path: "/inquiries", color: "from-orange-500/20 to-orange-600/10", howTo: "Visit Inquiries to see all customer submissions. Track status, view details, and respond to customer needs efficiently." },
      { icon: Shield, title: "Collect Fields", desc: "Capture structured customer data with custom fields", path: "/settings", color: "from-teal-500/20 to-teal-600/10", howTo: "In Settings, define the fields your bot should collect from customers — like name, email, phone, or any custom fields specific to your business." },
      ...common,
    ];
  })();

  useEffect(() => {
    const timer = setInterval(() => setCurrent(c => (c + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const prev = () => setCurrent(c => (c - 1 + slides.length) % slides.length);
  const next = () => setCurrent(c => (c + 1) % slides.length);
  const slide = slides[current];

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="border-border/50 overflow-hidden">
          <CardContent className="p-0">
            <div className="relative">
              <motion.div
                key={current}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
                className={`bg-gradient-to-br ${slide.color} p-5 sm:p-8`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-5">
                  <div className="rounded-xl bg-background/80 p-3 sm:p-4 w-fit shrink-0">
                    <slide.icon className="h-7 w-7 sm:h-10 sm:w-10 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-bold text-base sm:text-xl">{slide.title}</h3>
                      {slide.logos && slide.logos.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          {slide.logos.map((logo, idx) => (
                            <img key={idx} src={logo} alt="" className="h-5 w-5 sm:h-6 sm:w-6 object-contain" />
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">{slide.desc}</p>
                    {/* Show howTo content inline on desktop */}
                    <p className="hidden sm:block text-xs text-muted-foreground/80 mt-3 leading-relaxed">{slide.howTo}</p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    {/* Learn More button only on mobile */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 flex-1 sm:hidden text-xs"
                      onClick={() => setOverlaySlide(slide)}
                    >
                      <HelpCircle className="h-3.5 w-3.5" /> Learn More
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1 flex-1 sm:flex-none text-xs"
                      onClick={() => navigate(slide.path)}
                    >
                      Go <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>

              {/* Navigation */}
              <div className="flex items-center justify-between px-4 py-2 bg-background border-t border-border/30">
                <button onClick={prev} className="p-1 rounded-full hover:bg-secondary transition-colors">
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </button>
                <div className="flex gap-1.5 flex-wrap justify-center max-w-[70%]">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrent(i)}
                      className={`h-1.5 rounded-full transition-all ${i === current ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"}`}
                    />
                  ))}
                </div>
                <button onClick={next} className="p-1 rounded-full hover:bg-secondary transition-colors">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Feature Info Overlay */}
      {overlaySlide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setOverlaySlide(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className={`bg-gradient-to-br ${overlaySlide.color} p-6 flex items-center gap-4`}>
              <div className="rounded-xl bg-background/80 p-3 shrink-0">
                <overlaySlide.icon className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg">{overlaySlide.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{overlaySlide.desc}</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <HelpCircle className="h-4 w-4 text-primary" /> How to use
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{overlaySlide.howTo}</p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setOverlaySlide(null)}>
                  Close
                </Button>
                <Button size="sm" className="flex-1 gap-1" onClick={() => { setOverlaySlide(null); navigate(overlaySlide.path); }}>
                  Go to {overlaySlide.title.split(" ")[0]} <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
/* ==================== CONVERSATIONS SECTION ==================== */
function ConversationsSection({
  conversations, loadingConvos, formatDate
}: {
  conversations: ConversationWithMessages[];
  loadingConvos: boolean;
  formatDate: (d: string) => string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Chats</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Chat history and live messages</p>
      </div>

      {loadingConvos ? (
        <div className="text-center text-muted-foreground py-12">Loading conversations...</div>
      ) : conversations.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="text-center py-16">
            <MessageSquare className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No conversations yet</p>
            <p className="text-sm text-muted-foreground mt-1">Conversations will appear here once customers start chatting.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map((convo, i) => (
            <motion.div key={convo.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="rounded-full bg-primary/10 p-2 shrink-0">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {convo.lastMessage ? convo.lastMessage.slice(0, 80) + (convo.lastMessage.length > 80 ? "..." : "") : "No messages"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(convo.created_at)} -- {convo.messageCount} messages
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0 ml-3">
                    {convo.session_id ? "Session" : "Anonymous"}
                  </Badge>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ==================== WRAPPER SECTIONS ==================== */
function ProductsSection({ agentId, meta, defaultCurrency, onCurrencyChanged, autoOpen = false }: { agentId: string; meta: AgentMeta; defaultCurrency: string; onCurrencyChanged?: () => void; autoOpen?: boolean }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Products</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your product catalog for the chatbot</p>
      </div>
      <ProductsTab agentId={agentId} meta={meta} defaultCurrency={defaultCurrency} onCurrencyChanged={onCurrencyChanged} autoOpen={autoOpen} />
    </div>
  );
}

function ServicesSection({ agentId, agentType, defaultCurrency, onCurrencyChanged, autoOpen = false }: { agentId: string; agentType?: AgentType; defaultCurrency: string; onCurrencyChanged?: () => void; autoOpen?: boolean }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Services</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your services for the chatbot</p>
      </div>
      <ServicesTab agentId={agentId} agentType={agentType} defaultCurrency={defaultCurrency} onCurrencyChanged={onCurrencyChanged} autoOpen={autoOpen} />
    </div>
  );
}

function OrdersSectionView({ agentId, defaultCurrency, autoOpen = false }: { agentId: string; defaultCurrency: string; autoOpen?: boolean }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Orders</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage customer orders from your chatbot</p>
      </div>
      <OrdersTab agentId={agentId} defaultCurrency={defaultCurrency} autoOpen={autoOpen} />
    </div>
  );
}

function BookingsSection({ agentId }: { agentId: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Bookings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">View and manage all bookings</p>
      </div>
      <BookingsTab agentId={agentId} />
    </div>
  );
}

function AvailabilitySection({ agentId }: { agentId: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Availability</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Set your available time slots</p>
      </div>
      <AvailabilityTab agentId={agentId} />
    </div>
  );
}

function InquiriesSection({ agentId }: { agentId: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Inquiries</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Customer inquiries from your chatbot</p>
      </div>
      <InquiriesTab agentId={agentId} />
    </div>
  );
}

/* ==================== SETTINGS SECTION ==================== */
function SettingsSection({
  agent, id: agentId, meta, editingSection, setEditingSection,
  editCapabilities, setEditCapabilities,
  editHours, setEditHours,
  editRules, setEditRules,
  editContact, setEditContact,
  defaultLanguage, setDefaultLanguage,
  systemPrompt, setSystemPrompt,
  saving, saveSection,
}: {
  agent: Agent; id: string; meta: AgentMeta;
  editingSection: string | null; setEditingSection: (s: string | null) => void;
  editCapabilities: string[]; setEditCapabilities: (v: string[]) => void;
  editHours: string; setEditHours: (v: string) => void;
  editRules: string[]; setEditRules: (v: string[]) => void;
  editContact: string; setEditContact: (v: string) => void;
  defaultLanguage: string; setDefaultLanguage: (v: string) => void;
  systemPrompt: string; setSystemPrompt: (v: string) => void;
  saving: boolean; saveSection: (section: string) => void;
}) {
  const navigate = useNavigate();
  const [reconfiguring, setReconfiguring] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configure your chatbot behavior</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Capabilities */}
        <Card className="border-border/50 h-full">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <CardTitle className="font-display text-lg">Capabilities</CardTitle>
              </div>
              {editingSection !== "capabilities" ? (
                <button onClick={() => setEditingSection("capabilities")} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
              ) : (
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => saveSection("capabilities")} disabled={saving}><Check className="h-4 w-4 text-primary" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { setEditCapabilities(meta.capabilities || []); setEditingSection(null); }}><X className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editingSection === "capabilities" ? (
              <div className="space-y-2">
                {editCapabilities.map((cap, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={cap} onChange={e => { const n = [...editCapabilities]; n[i] = e.target.value; setEditCapabilities(n); }} className="text-sm" />
                    <Button size="icon" variant="ghost" onClick={() => setEditCapabilities(editCapabilities.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setEditCapabilities([...editCapabilities, ""])} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add</Button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {(meta.capabilities && meta.capabilities.length > 0) ? meta.capabilities.map((cap, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <span>{cap}</span>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No capabilities defined yet</p>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Business Hours & Contact */}
        <Card className="border-border/50 h-full">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <CardTitle className="font-display text-lg">Business Info</CardTitle>
              </div>
              {editingSection !== "hours" ? (
                <button onClick={() => setEditingSection("hours")} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
              ) : (
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { saveSection("hours"); saveSection("contact"); }} disabled={saving}><Check className="h-4 w-4 text-primary" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { setEditHours(meta.businessHours || ""); setEditContact(meta.contactInfo || ""); setEditingSection(null); }}><X className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {editingSection === "hours" ? (
              <>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Business Hours</Label>
                  <Input value={editHours} onChange={e => setEditHours(e.target.value)} placeholder="e.g. Mon-Fri 9am-5pm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Contact Info</Label>
                  <Textarea value={editContact} onChange={e => setEditContact(e.target.value)} placeholder="Phone, email, address..." rows={3} />
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Hours</p>
                  <p className="text-sm">{meta.businessHours || "Not set"}</p>
                </div>
                <Separator className="bg-border/50" />
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Contact</p>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{meta.contactInfo || "Not set"}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Rules */}
        <Card className="border-border/50 h-full">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <CardTitle className="font-display text-lg">Rules & Guidelines</CardTitle>
              </div>
              {editingSection !== "rules" ? (
                <button onClick={() => setEditingSection("rules")} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
              ) : (
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => saveSection("rules")} disabled={saving}><Check className="h-4 w-4 text-primary" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { setEditRules(meta.rules || []); setEditingSection(null); }}><X className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editingSection === "rules" ? (
              <div className="space-y-2">
                {editRules.map((rule, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={rule} onChange={e => { const n = [...editRules]; n[i] = e.target.value; setEditRules(n); }} className="text-sm" />
                    <Button size="icon" variant="ghost" onClick={() => setEditRules(editRules.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setEditRules([...editRules, ""])} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Rule</Button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {(meta.rules && meta.rules.length > 0) ? meta.rules.map((rule, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-0.5 font-bold">--</span>
                    <span>{rule}</span>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No rules defined yet</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Language */}
      <Card id="settings-language" className="border-border/50 transition-all duration-300 rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <CardTitle className="font-display text-lg">Default Language</CardTitle>
          </div>
          <CardDescription>Choose which language your agent responds in</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={defaultLanguage} onValueChange={setDefaultLanguage}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map(lang => (
                <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => saveSection("language")} disabled={saving} className="gap-1.5">
            <Save className="h-3.5 w-3.5" /> Save Language
          </Button>
        </CardContent>
      </Card>

      {/* Welcome Sequence */}
      <Card id="settings-welcome" className="border-border/50 transition-all duration-300 rounded-xl">
        <CardContent className="p-6">
          <WelcomeSequenceEditor agentId={agentId!} />
        </CardContent>
      </Card>

      {/* Payment Methods */}
      {(agent.agent_type === "order_handler" || agent.agent_type === "booking_agent") && (
        <PaymentMethodsSection agentId={agentId!} />
      )}

      {/* Document Templates */}
      <Card id="settings-documents" className="border-border/50 transition-all duration-300 rounded-xl">
        <CardContent className="p-6">
          <DocumentTemplatesTab agentId={agentId!} />
        </CardContent>
      </Card>

      {/* Collect Fields */}
      <div id="settings-collect-fields">
        <CollectFieldsSection agentId={agentId!} />
      </div>

      {/* Follow-up Messages */}
      <div id="settings-followup">
        <FollowUpConfig agentId={agentId!} />
      </div>

      {/* Notification Templates */}
      <div id="settings-notifications" className="space-y-4">
        <NotificationConfig agentId={agentId!} entityType="booking" />
        <NotificationConfig agentId={agentId!} entityType="order" />
        <NotificationConfig agentId={agentId!} entityType="inquiry" />
      </div>

      {/* System Prompt */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <CardTitle className="font-display text-lg">System Prompt</CardTitle>
              <Badge variant="outline" className="text-xs">Advanced</Badge>
            </div>
            {editingSection !== "prompt" ? (
              <button onClick={() => setEditingSection("prompt")} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
            ) : (
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => saveSection("prompt")} disabled={saving}><Check className="h-4 w-4 text-primary" /></Button>
                <Button size="icon" variant="ghost" onClick={() => { setSystemPrompt(agent.system_prompt); setEditingSection(null); }}><X className="h-4 w-4" /></Button>
              </div>
            )}
          </div>
          <CardDescription>The instructions that define your agent's behavior</CardDescription>
        </CardHeader>
        <CardContent>
          {editingSection === "prompt" ? (
            <Textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} rows={10} className="text-sm font-mono" />
          ) : (
            <pre className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/50 rounded-lg p-4 max-h-48 overflow-y-auto">{agent.system_prompt}</pre>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

/* ==================== ACCOUNT SECTION ==================== */
function AccountSection({ user, signOut, agentId, agent, meta, editingSection, setEditingSection,
  editCapabilities, setEditCapabilities, editHours, setEditHours,
  editRules, setEditRules, editContact, setEditContact,
  defaultLanguage, setDefaultLanguage, systemPrompt, setSystemPrompt,
  saving, saveSection,
}: {
  user: any; signOut: () => Promise<void>;
  agentId: string | null; agent: Agent | null;
  meta: AgentMeta;
  editingSection: string | null; setEditingSection: (s: string | null) => void;
  editCapabilities: string[]; setEditCapabilities: (v: string[]) => void;
  editHours: string; setEditHours: (v: string) => void;
  editRules: string[]; setEditRules: (v: string[]) => void;
  editContact: string; setEditContact: (v: string) => void;
  defaultLanguage: string; setDefaultLanguage: (v: string) => void;
  systemPrompt: string; setSystemPrompt: (v: string) => void;
  saving: boolean; saveSection: (section: string) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const tabParam = new URLSearchParams(location.search).get("tab") || "whatsapp";
  const sectionParam = new URLSearchParams(location.search).get("section") || "";
  const [activeTab, setActiveTab] = useState(tabParam);
  const [displayName, setDisplayName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [reconfiguring, setReconfiguring] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    setActiveTab(tabParam);
  }, [tabParam]);

  // Scroll to section when arriving via quick link
  useEffect(() => {
    if (sectionParam && activeTab === "settings") {
      setTimeout(() => {
        const el = document.getElementById(`settings-${sectionParam}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.classList.add("ring-2", "ring-primary", "ring-offset-2");
        setTimeout(() => el?.classList.remove("ring-2", "ring-primary", "ring-offset-2"), 2000);
      }, 400);
    }
  }, [sectionParam, activeTab]);

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
        if (data) setDisplayName(data.display_name || "");
        setProfileLoading(false);
      });
    }
  }, [user]);

  const saveProfile = async () => {
    setProfileSaving(true);
    try {
      await supabase.from("profiles").update({ display_name: displayName }).eq("user_id", user.id);
      toast({ title: "Profile updated!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Account</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your account, billing, and integrations</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="whatsapp" className="gap-1 text-xs sm:text-sm px-1.5 sm:px-3">
            <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> <span className="truncate">WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-1 text-xs sm:text-sm px-1.5 sm:px-3">
            <CreditCard className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> <span className="truncate">Billing</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1 text-xs sm:text-sm px-1.5 sm:px-3">
            <Settings className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> <span className="truncate">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="mt-6">
          {agentId ? <WhatsAppTab agentId={agentId} /> : <p className="text-muted-foreground">No agent configured.</p>}
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <UserBillingSection />
        </TabsContent>

        <TabsContent value="settings" className="mt-6 space-y-6">
          {/* Bot Settings */}
          {agent && agentId && (
            <SettingsSection
              agent={agent}
              id={agentId}
              meta={meta}
              editingSection={editingSection}
              setEditingSection={setEditingSection}
              editCapabilities={editCapabilities}
              setEditCapabilities={setEditCapabilities}
              editHours={editHours}
              setEditHours={setEditHours}
              editRules={editRules}
              setEditRules={setEditRules}
              editContact={editContact}
              setEditContact={setEditContact}
              defaultLanguage={defaultLanguage}
              setDefaultLanguage={setDefaultLanguage}
              systemPrompt={systemPrompt}
              setSystemPrompt={setSystemPrompt}
              saving={saving}
              saveSection={saveSection}
            />
          )}

          {/* Profile */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-lg">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
              </div>
              <Button onClick={saveProfile} disabled={profileSaving || profileLoading} size="sm" className="gap-1.5">
                <Save className="h-3.5 w-3.5" /> Save Profile
              </Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/30">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-lg text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-destructive/20 bg-destructive/5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Reconfigure Bot</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Deletes products, services, FAQs, welcome sequence, payment methods, templates, and settings. Chat history and billing stats are preserved.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-2 shrink-0">
                      <RefreshCw className="h-4 w-4" /> Reconfigure
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reconfigure this bot?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove your bot configuration and return you to the initial setup flow.
                        <br /><br />
                        <strong>Chat history and billing-related stats will be preserved.</strong>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={reconfiguring}
                        onClick={async (e) => {
                          e.preventDefault();
                          setReconfiguring(true);
                          try {
                            const { error } = await supabase.functions.invoke("reconfigure-agent");
                            if (error) throw error;
                            toast({ title: "Bot reset successfully", description: "Redirecting to setup..." });
                            import("@/lib/activityLog").then(m => m.logActivity({ action: "agent_reconfigured", entityType: "agent" }));
                            navigate("/setup", { replace: true });
                          } catch (err: any) {
                            toast({ title: "Error", description: err.message, variant: "destructive" });
                          } finally {
                            setReconfiguring(false);
                          }
                        }}
                      >
                        {reconfiguring ? "Deleting..." : "Yes, reconfigure"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border/50">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Sign Out</p>
                  <p className="text-xs text-muted-foreground mt-1">Sign out of your account.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { signOut(); navigate("/"); }}>
                  <LogOut className="h-4 w-4 mr-1.5" /> Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
