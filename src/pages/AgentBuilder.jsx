import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bot, ArrowLeft, ArrowRight, Check, Copy, ExternalLink, Globe, Loader2, X, FileText, Upload, Sparkles, Eye, MessageSquareText, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { AGENT_TYPE_LABELS, LANGUAGE_OPTIONS } from "@/types/agent";
import type { AgentType, AgentPersonality } from "@/types/agent";
import ChatWidget from "@/components/ChatWidget";
import ConfiguratorChat, { type ConfiguratorChatHandle } from "@/components/ConfiguratorChat";
import ConfigGuideOverlay from "@/components/ConfigGuideOverlay";
import { Loader2 as Spinner } from "lucide-react";
import { Link } from "react-router-dom";
import { scrapeWebsite, type ScrapeResult } from "@/lib/firecrawl";
import { extractDocumentText, isSupportedDocument, type DocumentExtractResult } from "@/lib/documentExtract";
import ReactMarkdown from "react-markdown";
import shopifyLogo from "@/assets/shopify-logo.png";
import woocommerceLogo from "@/assets/woocommerce-logo.png";

const STEPS = ["Choose", "Describe", "Configure"];

const AGENT_TYPE_DETAILS: Array<{
  type: AgentType;
  label: string;
  desc: string;
  points: string[];
}> = [
  {
    type: "order_handler",
    label: "Order Agent",
    desc: "For product-based businesses",
    points: [
      "Manage products, categories & inventory in real-time",
      "Accept and track orders with payment processing",
      "Generate invoices and handle delivery coordination",
    ],
  },
  {
    type: "booking_agent",
    label: "Booking Agent",
    desc: "For service-based businesses",
    points: [
      "Schedule appointments with smart availability management",
      "Send booking confirmations and reminders automatically",
      "Sync with Google Calendar for seamless coordination",
    ],
  },
  {
    type: "inquiry_only",
    label: "Inquiries Agent",
    desc: "For FAQ & lead collection",
    points: [
      "Answer common questions instantly from your knowledge base",
      "Collect customer details and inquiries automatically",
      "Qualify leads and route them to the right team member",
    ],
  },
];

export default function AgentBuilder() {
  const { user, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [deploySuccess, setDeploySuccess] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [step, setStep] = useState(() => {
    const saved = sessionStorage.getItem("agent_builder_step");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [loading, setLoading] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(() => {
    return sessionStorage.getItem("agent_builder_agent_id") || null;
  });
  const [configReady, setConfigReady] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [configSummary, setConfigSummary] = useState<string | null>(null);
  const configuratorRef = useRef<ConfiguratorChatHandle>(null);

  // Auto sign-in anonymously so the build flow works without forcing signup.
  // Real signup happens at the end (Deploy → /auth?mode=signup&fromBuilder=1).
  useEffect(() => {
    if (authLoading) return;
    if (user) return;
    let cancelled = false;
    setBootstrapping(true);
    supabase.auth.signInAnonymously().then(({ error }) => {
      if (cancelled) return;
      if (error) {
        toast({ title: "Couldn't start your session", description: error.message, variant: "destructive" });
      }
      setBootstrapping(false);
    });
    return () => { cancelled = true; };
  }, [user, authLoading]);

  // Check if user has an existing agent (edit mode vs new) — only for permanent users
  useEffect(() => {
    if (!user) return;
    if ((user as any).is_anonymous) return; // Skip redirect for anonymous build sessions
    const checkExisting = async () => {
      const { data } = await supabase
        .from("agents")
        .select("id, status")
        .eq("user_id", user.id)
        .limit(1);
      if (data && data.length > 0) {
        const agent = data[0];
        if (agent.status === "draft") {
          // Continue editing draft
          setAgentId(agent.id);
          setIsEditing(true);
        } else {
          // Active agent - redirect to manage
          navigate("/dashboard", { replace: true });
          return;
        }
      }
    };
    checkExisting();
  }, [user, navigate]);
  // Persist step & agentId to sessionStorage
  useEffect(() => {
    sessionStorage.setItem("agent_builder_step", String(step));
  }, [step]);
  useEffect(() => {
    if (agentId) sessionStorage.setItem("agent_builder_agent_id", agentId);
  }, [agentId]);

  // Form state
  const [name, setName] = useState(() => sessionStorage.getItem("agent_builder_name") || "My Agent");
  const [agentType, setAgentType] = useState<AgentType>(() => {
    return (sessionStorage.getItem("agent_builder_type") as AgentType) || "order_handler";
  });
  const [personality, setPersonality] = useState<AgentPersonality>("friendly");
  const [systemPrompt, setSystemPrompt] = useState("You are a helpful AI assistant.");
  const [welcomeMessage, setWelcomeMessage] = useState("Hello! How can I help you today?");
  const [knowledgeBase, setKnowledgeBase] = useState("");
  const [description, setDescription] = useState(() => sessionStorage.getItem("agent_builder_description") || "");
  const [status, setStatus] = useState<"draft" | "active" | "paused">("draft");
  const [defaultLanguage, setDefaultLanguage] = useState("auto");

  // Mobile preview overlay
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  // Website scraping state
  const [websiteUrl, setWebsiteUrl] = useState(() => sessionStorage.getItem("agent_builder_website_url") || "");
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeData, setScrapeData] = useState<ScrapeResult | null>(() => {
    try {
      const saved = sessionStorage.getItem("agent_builder_scrape_data");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // Document upload state
  const [uploadedDocContent, setUploadedDocContent] = useState<string | undefined>(() => sessionStorage.getItem("agent_builder_doc_content") || undefined);
  const [uploadedDocName, setUploadedDocName] = useState<string | undefined>(() => sessionStorage.getItem("agent_builder_doc_name") || undefined);
  const [isExtractingDoc, setIsExtractingDoc] = useState(false);

  // Store connection state
  const [showShopifyDialog, setShowShopifyDialog] = useState(false);
  const [showWooDialog, setShowWooDialog] = useState(false);
  const [showWhatsAppGuide, setShowWhatsAppGuide] = useState(false);
  const [shopifyDomain, setShopifyDomain] = useState("");
  const [wooStoreUrl, setWooStoreUrl] = useState("");
  const [isConnectingStore, setIsConnectingStore] = useState(false);

  // Listen for store connection callbacks
  useEffect(() => {
    const handleMessage = async (e: MessageEvent) => {
      if (!agentId) return;
      if (e.data?.type === "shopify-connected" || e.data?.type === "woocommerce-connected") {
        toast({ title: "✅ Store connected!", description: "Syncing products now..." });
        setShowShopifyDialog(false);
        setShowWooDialog(false);
        setIsConnectingStore(true);
        try {
          const fnName = e.data.type === "shopify-connected" ? "shopify-sync" : "woocommerce-sync";
          const { data, error } = await supabase.functions.invoke(fnName, {
            body: { action: "sync_products", agent_id: agentId },
          });
          if (error) throw error;
          toast({ title: "Products synced!", description: `Imported ${data?.imported || 0} products, updated ${data?.updated || 0}.` });
        } catch (err: any) {
          toast({ title: "Sync error", description: err.message, variant: "destructive" });
        } finally {
          setIsConnectingStore(false);
        }
        setStep(2);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [agentId]);

  const connectShopify = async () => {
    if (!user || !shopifyDomain.trim()) return;
    let currentAgentId = agentId;
    if (!currentAgentId) {
      await saveAgent();
      currentAgentId = sessionStorage.getItem("agent_builder_agent_id") || agentId;
    }
    if (!currentAgentId) { toast({ title: "Error", description: "Could not create agent", variant: "destructive" }); return; }
    setIsConnectingStore(true);
    try {
      let cleanDomain = shopifyDomain.trim().replace(/\/+$/, "").replace(/^https?:\/\//, "");
      if (!cleanDomain.includes(".myshopify.com")) cleanDomain += ".myshopify.com";
      const { data, error } = await supabase.functions.invoke("shopify-auth-url", {
        body: { shop: cleanDomain, agent_id: currentAgentId, user_id: user.id, redirect_origin: window.location.origin },
      });
      if (error) throw error;
      if (data?.auth_url) window.location.href = data.auth_url;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsConnectingStore(false);
    }
  };

  const connectWooCommerce = async () => {
    if (!user || !wooStoreUrl.trim()) return;
    let currentAgentId = agentId;
    if (!currentAgentId) {
      await saveAgent();
      currentAgentId = sessionStorage.getItem("agent_builder_agent_id") || agentId;
    }
    if (!currentAgentId) { toast({ title: "Error", description: "Could not create agent", variant: "destructive" }); return; }
    setIsConnectingStore(true);
    try {
      const { data, error } = await supabase.functions.invoke("woocommerce-auth-url", {
        body: { store_url: wooStoreUrl.trim(), agent_id: currentAgentId, redirect_origin: window.location.origin },
      });
      if (error) throw error;
      if (data?.auth_url) window.location.href = data.auth_url;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsConnectingStore(false);
    }
  };

  // Persist form data that feeds into ConfiguratorChat seed message
  useEffect(() => {
    if (name) sessionStorage.setItem("agent_builder_name", name);
  }, [name]);
  useEffect(() => {
    if (description) sessionStorage.setItem("agent_builder_description", description);
  }, [description]);
  useEffect(() => {
    if (websiteUrl) sessionStorage.setItem("agent_builder_website_url", websiteUrl);
  }, [websiteUrl]);
  useEffect(() => {
    if (scrapeData) sessionStorage.setItem("agent_builder_scrape_data", JSON.stringify(scrapeData));
  }, [scrapeData]);
  useEffect(() => {
    if (uploadedDocContent) sessionStorage.setItem("agent_builder_doc_content", uploadedDocContent);
    if (uploadedDocName) sessionStorage.setItem("agent_builder_doc_name", uploadedDocName);
  }, [uploadedDocContent, uploadedDocName]);

  useEffect(() => {
    if (isEditing && agentId) loadAgent(agentId);
  }, [isEditing, agentId]);

  const loadAgent = async (agentId: string) => {
    const { data } = await supabase.from("agents").select("*").eq("id", agentId).single();
    if (data) {
      setName(data.name);
      setAgentType(data.agent_type);
      setPersonality(data.personality);
      setSystemPrompt(data.system_prompt);
      setWelcomeMessage(data.welcome_message);
      setKnowledgeBase(data.knowledge_base || "");
      setStatus(data.status);
      setDefaultLanguage((data as any).default_language || "auto");
      setConfigReady(true);
    }
  };

  const handleScrapeWebsite = async () => {
    if (!websiteUrl.trim()) return;
    setIsScraping(true);
    setScrapeData(null);
    try {
      const result = await scrapeWebsite(websiteUrl.trim());
      setScrapeData(result);
      if (result.success) {
        toast({ title: "✅ Website scraped!", description: `Extracted content from ${result.data?.metadata?.title || websiteUrl}` });
        // Auto-save and redirect to Configure step
        if (!agentId) await saveAgent();
        setStep(2);
      } else {
        toast({ title: "Scrape failed", description: result.error || "Could not scrape website", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsScraping(false);
    }
  };

  const handleDocumentUpload = async (file: File) => {
    if (!isSupportedDocument(file)) {
      toast({ title: "Unsupported file", description: "Please upload a PDF, TXT, MD, or CSV file.", variant: "destructive" });
      return;
    }
    setIsExtractingDoc(true);
    try {
      const result = await extractDocumentText(file);
      if (result.success && result.content) {
        setUploadedDocContent(result.content);
        setUploadedDocName(result.fileName);
        toast({ title: "📄 Document extracted!", description: `Got content from ${result.fileName}` });
        // Auto-save and redirect to Configure step
        if (!agentId) await saveAgent();
        setStep(2);
      } else {
        toast({ title: "Extraction failed", description: result.error || "Could not extract text", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsExtractingDoc(false);
    }
  };

  const saveAgent = async () => {
    if (!user) return null;
    setLoading(true);
    try {
      const payload = {
        name,
        agent_type: agentType,
        personality,
        system_prompt: systemPrompt,
        welcome_message: welcomeMessage,
        knowledge_base: knowledgeBase,
        user_id: user.id,
        status,
        default_language: defaultLanguage,
      };

      if (agentId) {
        await supabase.from("agents").update(payload).eq("id", agentId);
        sessionStorage.setItem("agent_builder_agent_id", agentId);
        toast({ title: "Agent saved!" });
        return agentId;
      } else {
        const { data } = await supabase.from("agents").insert(payload).select().single();
        if (data?.id) {
          setAgentId(data.id);
          sessionStorage.setItem("agent_builder_agent_id", data.id);
          toast({ title: "Agent saved!" });
          return data.id;
        }
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
    return null;
  };

  const handleConfigReady = async (config: any) => {
    if (config.name) setName(config.name);
    if (config.agentType) setAgentType(config.agentType);
    if (config.personality) setPersonality(config.personality);
    if (config.systemPrompt) setSystemPrompt(config.systemPrompt);
    if (config.welcomeMessage) setWelcomeMessage(config.welcomeMessage);
    if (config.defaultLanguage) setDefaultLanguage(config.defaultLanguage);

    // Build knowledge base with structured meta
    const metaObj = {
      capabilities: config.capabilities || [],
      businessHours: config.businessHours || "",
      faqs: config.faqs || [],
      rules: config.rules || [],
      contactInfo: config.contactInfo || "",
    };
    let kb = config.knowledgeBase || "";
    kb += `\n\n---AGENT_META---\n${JSON.stringify(metaObj)}`;
    setKnowledgeBase(kb);

    // Auto-generate welcome sequence items from extracted config
    if (agentId && config.welcomeSequence && config.welcomeSequence.length > 0) {
      // Clear existing welcome items
      await supabase.from("welcome_items").delete().eq("agent_id", agentId);
      // Insert new ones
      const rows = config.welcomeSequence.map((item: any, i: number) => ({
        agent_id: agentId,
        item_type: item.type || "text",
        content: item.content || null,
        media_url: null,
        file_name: null,
        sort_order: i,
      }));
      await supabase.from("welcome_items").insert(rows);
    } else if (agentId && config.welcomeMessage) {
      // Fallback: create a single text welcome item
      await supabase.from("welcome_items").delete().eq("agent_id", agentId);
      await supabase.from("welcome_items").insert({
        agent_id: agentId,
        item_type: "text",
        content: config.welcomeMessage,
        sort_order: 0,
      });
    }

    setConfigReady(true);
    // Save to DB immediately so ChatWidget can fetch updated data
    if (agentId) {
      const payload: any = {};
      if (config.name) payload.name = config.name;
      if (config.agentType) payload.agent_type = config.agentType;
      if (config.personality) payload.personality = config.personality;
      if (config.systemPrompt) payload.system_prompt = config.systemPrompt;
      if (config.welcomeMessage) payload.welcome_message = config.welcomeMessage;
      let kb = config.knowledgeBase || "";
      const metaObj2 = {
        capabilities: config.capabilities || [],
        businessHours: config.businessHours || "",
        faqs: config.faqs || [],
        rules: config.rules || [],
        contactInfo: config.contactInfo || "",
      };
      kb += `\n\n---AGENT_META---\n${JSON.stringify(metaObj2)}`;
      payload.knowledge_base = kb;
      await supabase.from("agents").update(payload).eq("id", agentId);

      // Save structured availability to agent_availability table
      if (config.availability && Array.isArray(config.availability) && config.availability.length > 0) {
        await supabase.from("agent_availability").delete().eq("agent_id", agentId);
        const slotDuration = config.slotDurationMinutes || 30;
        const availRows = config.availability.map((slot: any) => ({
          agent_id: agentId,
          day_of_week: slot.day_of_week,
          start_time: slot.start_time || "09:00",
          end_time: slot.end_time || "17:00",
          is_available: slot.is_available !== false,
          slot_duration_minutes: slotDuration,
        }));
        await supabase.from("agent_availability").insert(availRows);
      }
    }
    setPreviewKey(k => k + 1);
  };

  const handleDeploy = async () => {
    setLoading(true);
    try {
      const resolvedAgentId = await saveAgent();
      const isAnon = !!(user as any)?.is_anonymous;
      if (resolvedAgentId) {
        // Keep as draft until they finish signup + pricing; then we'll mark active.
        if (!isAnon) {
          await supabase.from("agents").update({ status: "active" }).eq("id", resolvedAgentId);
        }
        localStorage.setItem("pending_built_agent_id", resolvedAgentId);
      }

      if (isAnon) {
        // Anonymous build session — keep builder state intact until plan selection
        // fully succeeds so the user never loses configured data on a bad redirect.
        navigate("/auth?mode=signup&fromBuilder=1", { replace: true });
        return;
      }
      // Permanent account flow can safely clear the transient builder session now.
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
      setDeploySuccess(true);
      setTimeout(() => navigate("/dashboard"), 3000);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const chatUrl = agentId ? `${window.location.origin}/agents/${agentId}/chat` : "";

  if (bootstrapping || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm">Setting up your build session…</span>
        </div>
      </div>
    );
  }

  if (deploySuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="h-28 w-28 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-8"
          >
            <Check className="h-14 w-14 text-primary" />
          </motion.div>
          <h1 className="font-display text-3xl font-bold mb-3">Agent Deployed Successfully!</h1>
          <p className="text-muted-foreground mb-8">Your AI agent is now live and ready to handle conversations.</p>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Redirecting to dashboard...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 glass">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
           <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Home</span>
          </Link>
           <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
            {STEPS.map((s, i) => (
              <button
                key={s}
                onClick={() => { if (i <= step || agentId) setStep(i); }}
                className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm transition-colors whitespace-nowrap ${
                  i === step ? "bg-primary text-primary-foreground" : i < step ? "text-accent" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {i < step ? "✓ " : ""}{s}
              </button>
            ))}
          </div>
          <Button onClick={saveAgent} disabled={loading} size="sm" className="bg-primary hover:bg-primary/90 shrink-0">
            Save
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Step 0: Choose Agent Type */}
        {step === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[70vh]">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">What kind of agent do you need?</h1>
              <p className="text-muted-foreground text-base max-w-lg mx-auto">
                Choose the agent type that best fits your business. Each type comes with tailored features and a dedicated dashboard.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6 w-full max-w-[960px]">
              {AGENT_TYPE_DETAILS.map((opt, i) => (
                <motion.button
                  key={opt.type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => {
                    setAgentType(opt.type);
                    sessionStorage.setItem("agent_builder_type", opt.type);
                    setStep(1);
                  }}
                  className={`group relative flex flex-col items-start gap-3 sm:gap-4 p-5 sm:p-7 rounded-2xl border-2 transition-all duration-200 text-left min-h-0 sm:min-h-[260px] ${
                    agentType === opt.type
                      ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                      : "border-border/60 bg-card hover:border-primary/40 hover:shadow-md"
                  }`}
                >
                  <div>
                    <h3 className="font-display font-bold text-xl mb-1">{opt.label}</h3>
                    <p className="text-muted-foreground text-sm">{opt.desc}</p>
                  </div>
                  <ul className="space-y-3 mt-auto w-full">
                    {opt.points.map((point, pi) => (
                      <li key={pi} className="flex items-start gap-2.5 text-sm text-foreground/80">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="h-5 w-5 text-primary" />
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Choose Input Method */}
        {step === 1 && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">How would you like to get started?</h1>
              <p className="text-muted-foreground text-base max-w-lg mx-auto">
                Choose how to provide your business information. You can always add more details later.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5 w-full max-w-[1100px]">
              {/* Start from Scratch */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                onClick={async () => {
                  if (!agentId) await saveAgent();
                  setStep(2);
                }}
                disabled={loading}
                className="group relative flex flex-col items-center gap-4 p-6 py-8 rounded-2xl border border-border/60 bg-card hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 text-center"
              >
                <div className="rounded-2xl bg-primary/10 p-4 group-hover:bg-primary/20 transition-colors">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg mb-1">Start from Scratch</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">Chat with our assistant to build your agent step by step</p>
                </div>
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="h-5 w-5 text-primary" />
                </div>
              </motion.button>

              {/* Use My Website */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="relative flex flex-col items-center gap-4 p-6 py-8 rounded-2xl border border-border/60 bg-card hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 text-center"
              >
                {!isScraping && !scrapeData?.success ? (
                  <>
                    <div className="rounded-2xl bg-accent/10 p-4">
                      <Globe className="h-8 w-8 text-accent" />
                    </div>
                    <div className="w-full">
                      <h3 className="font-display font-semibold text-lg mb-1">Use My Website</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed mb-3">We'll extract content to build your agent</p>
                    </div>
                    <div className="w-full space-y-2">
                      <Input
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="https://yourwebsite.com"
                        className="h-11 text-sm w-full"
                        onKeyDown={async (e) => {
                          if (e.key === "Enter" && websiteUrl.trim()) {
                            await handleScrapeWebsite();
                          }
                        }}
                      />
                      <Button
                        onClick={handleScrapeWebsite}
                        disabled={!websiteUrl.trim()}
                        className="bg-primary hover:bg-primary/90 w-full gap-2"
                        size="sm"
                      >
                        Scan & Continue <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                ) : isScraping ? (
                  <div className="flex flex-col items-center gap-4 py-6">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Setting up your agent…</p>
                  </div>
                ) : null}
              </motion.div>

              {/* Upload Files */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="relative flex flex-col items-center gap-4 p-6 py-8 rounded-2xl border border-border/60 bg-card hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 text-center"
              >
                <label className="cursor-pointer flex flex-col items-center gap-4 w-full">
                  <input
                    type="file"
                    accept=".pdf,.txt,.md,.csv,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.tif,text/plain,application/pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleDocumentUpload(file);
                      e.target.value = "";
                    }}
                    disabled={isExtractingDoc}
                  />
                  <div className="rounded-2xl bg-secondary p-4">
                    {isExtractingDoc ? (
                      <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                    ) : (
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-lg mb-1">Upload Files</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {isExtractingDoc ? "Setting up your agent…" : "PDF, images, or text with your business info"}
                    </p>
                  </div>
                </label>
              </motion.div>

              {/* Upload WhatsApp Chat Export */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className="relative flex flex-col items-center gap-4 p-6 py-8 rounded-2xl border border-border/60 bg-card hover:border-[#25D366]/50 hover:shadow-lg hover:shadow-[#25D366]/5 transition-all duration-200 text-center"
              >
                <label className="cursor-pointer flex flex-col items-center gap-4 w-full">
                  <input
                    type="file"
                    accept=".txt,.zip,text/plain,application/zip"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleDocumentUpload(file);
                      e.target.value = "";
                    }}
                    disabled={isExtractingDoc}
                  />
                  <div className="rounded-2xl bg-[#25D366]/10 p-4">
                    {isExtractingDoc ? (
                      <Loader2 className="h-8 w-8 text-[#25D366] animate-spin" />
                    ) : (
                      <MessageSquareText className="h-8 w-8 text-[#25D366]" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-lg mb-1">WhatsApp Chat Export</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {isExtractingDoc ? "Analyzing chat history…" : "Upload exported chats to auto-generate FAQs"}
                    </p>
                  </div>
                </label>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowWhatsAppGuide(true); }}
                  className="text-xs text-[#25D366] hover:underline flex items-center gap-1 mt-auto"
                >
                  <Info className="h-3.5 w-3.5" /> How to export chats
                </button>
              </motion.div>

              {/* Connect Shopify */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                onClick={() => setShowShopifyDialog(true)}
                disabled={isConnectingStore}
                className="group relative flex flex-col items-center gap-4 p-6 py-8 rounded-2xl border border-border/60 bg-card hover:border-[#96bf48]/50 hover:shadow-lg hover:shadow-[#96bf48]/5 transition-all duration-200 text-center"
              >
                <div className="rounded-2xl bg-[#96bf48]/10 p-4 group-hover:bg-[#96bf48]/20 transition-colors">
                  <img src={shopifyLogo} alt="Shopify" className="h-8 w-8 object-contain" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg mb-1">Connect Shopify</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">Import products & orders from your Shopify store</p>
                </div>
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="h-5 w-5 text-[#96bf48]" />
                </div>
              </motion.button>

              {/* Connect WooCommerce */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                onClick={() => setShowWooDialog(true)}
                disabled={isConnectingStore}
                className="group relative flex flex-col items-center gap-4 p-6 py-8 rounded-2xl border border-border/60 bg-card hover:border-[#7f54b3]/50 hover:shadow-lg hover:shadow-[#7f54b3]/5 transition-all duration-200 text-center"
              >
                <div className="rounded-2xl bg-[#7f54b3]/10 p-4 group-hover:bg-[#7f54b3]/20 transition-colors">
                  <img src={woocommerceLogo} alt="WooCommerce" className="h-8 w-8 object-contain" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg mb-1">Connect WooCommerce</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">Import products & orders from your WooCommerce store</p>
                </div>
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="h-5 w-5 text-[#7f54b3]" />
                </div>
              </motion.button>
            </div>

            {isConnectingStore && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Connecting & syncing your store...</span>
              </div>
            )}

            <Button variant="outline" onClick={() => setStep(0)} className="mt-8 gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>

            {/* Shopify Dialog */}
            <Dialog open={showShopifyDialog} onOpenChange={setShowShopifyDialog}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <img src={shopifyLogo} alt="Shopify" className="h-6 w-6 object-contain" />
                    Connect Shopify Store
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Store domain</Label>
                    <Input
                      value={shopifyDomain}
                      onChange={(e) => setShopifyDomain(e.target.value)}
                      placeholder="yourstore.myshopify.com"
                      onKeyDown={(e) => { if (e.key === "Enter") connectShopify(); }}
                    />
                    <p className="text-xs text-muted-foreground">Enter your .myshopify.com domain</p>
                  </div>
                  <Button onClick={connectShopify} disabled={!shopifyDomain.trim() || isConnectingStore} className="w-full gap-2">
                    {isConnectingStore ? <Loader2 className="h-4 w-4 animate-spin" /> : <img src={shopifyLogo} alt="" className="h-4 w-4" />}
                    Connect & Import Products
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* WooCommerce Dialog */}
            <Dialog open={showWooDialog} onOpenChange={setShowWooDialog}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <img src={woocommerceLogo} alt="WooCommerce" className="h-6 w-6 object-contain" />
                    Connect WooCommerce Store
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Store URL</Label>
                    <Input
                      value={wooStoreUrl}
                      onChange={(e) => setWooStoreUrl(e.target.value)}
                      placeholder="https://yourstore.com"
                      onKeyDown={(e) => { if (e.key === "Enter") connectWooCommerce(); }}
                    />
                    <p className="text-xs text-muted-foreground">Enter your WordPress/WooCommerce store URL</p>
                  </div>
                  <Button onClick={connectWooCommerce} disabled={!wooStoreUrl.trim() || isConnectingStore} className="w-full gap-2">
                    {isConnectingStore ? <Loader2 className="h-4 w-4 animate-spin" /> : <img src={woocommerceLogo} alt="" className="h-4 w-4" />}
                    Connect & Import Products
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* WhatsApp Export Guide Dialog */}
            <Dialog open={showWhatsAppGuide} onOpenChange={setShowWhatsAppGuide}>
              <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <MessageSquareText className="h-5 w-5 text-[#25D366]" />
                    How to Export WhatsApp Chats
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-5 pt-2 text-sm">
                  <div>
                    <h4 className="font-semibold mb-2 text-foreground">📱 On your phone (Android & iOS)</h4>
                    <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                      <li>Open the <strong className="text-foreground">WhatsApp chat</strong> you want to export</li>
                      <li>Tap the <strong className="text-foreground">⋮ (three dots)</strong> menu → <strong className="text-foreground">More</strong> → <strong className="text-foreground">Export chat</strong></li>
                      <li>Choose <strong className="text-foreground">"Without media"</strong> for faster upload</li>
                      <li>Send the <code className="bg-muted px-1 rounded text-xs">.txt</code> file to yourself (email, drive, etc.)</li>
                      <li>Download and upload it here</li>
                    </ol>
                  </div>
                  <div className="border-t border-border pt-4">
                    <h4 className="font-semibold mb-2 text-foreground">💡 Tips for best results</h4>
                    <ul className="list-disc list-inside space-y-1.5 text-muted-foreground">
                      <li>Export chats with <strong className="text-foreground">customer interactions</strong> — the AI will learn from real Q&A patterns</li>
                      <li>Upload <strong className="text-foreground">multiple exports</strong> from different customers for a richer knowledge base</li>
                      <li>The system auto-detects recurring questions and crafts professional FAQ answers</li>
                      <li>Products, services, pricing, and business policies are also extracted automatically</li>
                    </ul>
                  </div>
                  <div className="border-t border-border pt-4">
                    <h4 className="font-semibold mb-2 text-foreground">⚙️ WhatsApp Settings</h4>
                    <p className="text-muted-foreground mb-2">To find the export option:</p>
                    <p className="text-muted-foreground"><strong className="text-foreground">Settings → Chats → Chat History → Export Chat</strong></p>
                    <p className="text-muted-foreground text-xs mt-1">(Path may vary slightly by device)</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Step 2: Configure — Split screen: Assistant + Live Preview */}
        {step === 2 && (
          <div className="space-y-4 pb-20 xl:pb-0">
            
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-xl sm:text-2xl font-bold">Configure & Preview</h2>
                <p className="text-muted-foreground text-sm mt-1 hidden sm:block">
                  Chat with the assistant on the left to configure your agent. Preview it live on the right.
                </p>
              </div>
              {/* Mobile-only agent name input */}
              <div className="xl:hidden shrink-0">
                <Label className="text-[10px] text-muted-foreground mb-0.5 block">Agent Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Agent"
                  className="w-36 h-8 text-xs text-center font-semibold"
                />
              </div>
            </div>

            {/* Mobile: See Preview overlay button */}
            {agentId && configReady && (
              <div className="xl:hidden">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setShowMobilePreview(true)}
                >
                  <Eye className="h-4 w-4" /> See Live Preview
                </Button>
              </div>
            )}

            {/* Mobile preview overlay */}
            {showMobilePreview && agentId && configReady && (
              <div className="fixed inset-0 z-50 bg-background xl:hidden flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <h3 className="font-semibold text-sm">Live Preview</h3>
                  <Button variant="ghost" size="icon" onClick={() => setShowMobilePreview(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <ChatWidget key={`mobile-${previewKey}`} agentId={agentId} welcomeMessage={welcomeMessage} authToken={session?.access_token} />
                </div>
              </div>
            )}

            <div className="flex flex-col xl:flex-row gap-4 sm:gap-6 items-start">
              {/* Left: Configuration Assistant */}
              <div className="w-full xl:flex-1 min-w-0 space-y-4">
                <ConfiguratorChat
                  ref={configuratorRef}
                  initialName={name}
                  initialType={agentType}
                  initialDescription={description}
                  scrapedContent={scrapeData?.success ? scrapeData.data?.markdown : undefined}
                  scrapedTitle={scrapeData?.success ? scrapeData.data?.metadata?.title : undefined}
                  uploadedDocContent={uploadedDocContent}
                  uploadedDocName={uploadedDocName}
                  onConfigReady={handleConfigReady}
                  onSummaryUpdate={(summary) => setConfigSummary(summary)}
                  agentId={agentId || undefined}
                />
              </div>

              {/* Right: Mobile Phone Preview — hidden on small screens */}
              <div data-guide="phone-preview" className="hidden xl:flex flex-col items-center xl:sticky xl:top-8 shrink-0 gap-3">
                {/* Editable agent name */}
                <div className="w-[300px]">
                  <Label className="text-xs text-muted-foreground mb-1 block">Agent Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My Agent"
                    className="text-center font-semibold"
                  />
                </div>
                <div className="relative w-[300px]">
                  <div className="rounded-[2.5rem] border-[6px] border-foreground/80 bg-background shadow-2xl overflow-hidden">
                    <div className="bg-foreground/80 mx-auto w-28 h-6 rounded-b-2xl" />
                    <div className="h-[520px] overflow-hidden rounded-b-[2rem] relative">
                      {agentId && configReady ? (
                        <ChatWidget key={previewKey} agentId={agentId} welcomeMessage={welcomeMessage} authToken={session?.access_token} />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm text-center px-6 gap-4">
                          {agentId && !configReady ? (
                            <>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                              >
                                <Spinner className="h-8 w-8 text-primary/60" />
                              </motion.div>
                              <div>
                                <p className="font-medium text-foreground/70 mb-1">Building your agent…</p>
                                <p className="text-xs text-muted-foreground">Answer the assistant's questions to see your bot come to life here</p>
                              </div>
                            </>
                          ) : (
                            <div>
                              <Bot className="h-10 w-10 mx-auto mb-3 opacity-40" />
                              <p>Complete the configuration to see a live preview of your agent here.</p>
                            </div>
                          )}
                        </div>
                      )}
                      {configSummary && !configReady && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border p-3 space-y-1"
                        >
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-1">
                            <Bot className="h-3.5 w-3.5" />
                            Configuration Summary
                          </div>
                          <div className="prose prose-sm max-w-none text-[11px] leading-relaxed text-foreground/80">
                            <ReactMarkdown>{configSummary}</ReactMarkdown>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 rounded-full bg-foreground/30" />
                </div>
              </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border p-3 flex flex-col gap-2 xl:static xl:bg-transparent xl:backdrop-blur-none xl:border-0 xl:p-0 xl:mt-4">
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="shrink-0">
                  <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Back</span>
                </Button>
                <Button
                  onClick={configReady ? handleDeploy : () => configuratorRef.current?.requestFinalize()}
                  className="bg-primary hover:bg-primary/90 gap-2 flex-1 text-sm sm:text-base"
                  disabled={loading}
                >
                  {loading ? <><Spinner className="h-4 w-4 animate-spin" /> Deploying...</> : configReady ? <><Check className="h-4 w-4" /> Deploy Agent</> : <><Sparkles className="h-4 w-4" /> Complete & Continue</>}
                </Button>
              </div>
              {configReady && !!(user as any)?.is_anonymous && (
                <p className="text-xs text-muted-foreground text-center xl:text-left">
                  You'll create your account & pick a plan after deploying — your build is saved.
                </p>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
