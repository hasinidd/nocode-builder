import { motion, AnimatePresence } from "framer-motion";
import React, { useState } from "react";
import {
  MessageSquare, Settings, Brain, Bell, Users, ShoppingCart,
  CreditCard, Mic, Target, Image, UserCheck,
  ChevronLeft, ChevronRight, Check, Send, ArrowRight,
  Phone, FileText, Globe, ShoppingBag,
  Calendar, Package, Bot
} from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "Instant WhatsApp Integration",
    desc: "Connect your WhatsApp account in seconds. Your AI agent works 24/7 handling all customer interactions.",
    preview: "whatsapp",
  },
  {
    icon: Brain,
    title: "Smart AI Training",
    desc: "Train your agent using websites, PDFs, chats, images, and store data — no tech skills needed.",
    preview: "training",
  },
  {
    icon: Settings,
    title: "Full Control, Zero Complexity",
    desc: "Manage everything via a web dashboard or directly through WhatsApp chat commands.",
    preview: "control",
  },
  {
    icon: Bell,
    title: "Automated Follow-Ups",
    desc: "Never lose a lead. Auto-send follow-ups to inactive chats and re-engage customers effortlessly.",
    preview: "followup",
  },
  {
    icon: ShoppingCart,
    title: "Orders, Bookings & CRM",
    desc: "Handle orders, bookings, inquiries, and track all customers — all inside WhatsApp.",
    preview: "orders",
  },
  {
    icon: CreditCard,
    title: "Payments via Stripe",
    desc: "Send payment links instantly and get paid directly within the chat experience.",
    preview: "payments",
  },
  {
    icon: Mic,
    title: "Voice, Image & Text AI",
    desc: "Customers can send voice notes, images, or text. Your AI understands and responds intelligently.",
    preview: "multimodal",
  },
  {
    icon: Target,
    title: "Lead Filtering & Analytics",
    desc: "Filter high-quality leads, track conversions, and make data-driven decisions.",
    preview: "analytics",
  },
  {
    icon: UserCheck,
    title: "AI → Human Handover",
    desc: "Auto-assign conversations to human agents based on intent, keywords, or priority.",
    preview: "handover",
  },
];

/* ── Phone frame wrapper ── */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-[220px] md:w-[260px]">
      <div className="rounded-[24px] bg-foreground/5 overflow-hidden shadow-lg">
        <div className="flex items-center justify-between px-4 py-1.5 text-[9px] text-muted-foreground">
          <span>9:41</span>
          <span className="text-[8px]">●●●</span>
        </div>
        <div className="px-3 py-2.5 min-h-[300px] md:min-h-[380px] flex flex-col bg-card mx-0.5 rounded-t-xl">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ── Mini interactive previews ── */

function WhatsAppPreview() {
  const [step, setStep] = useState(0);

  React.useEffect(() => {
    if (step === 0) {
      const t = setTimeout(() => setStep(1), 1500);
      return () => clearTimeout(t);
    }
    if (step === 1) {
      const t = setTimeout(() => setStep(2), 2000);
      return () => clearTimeout(t);
    }
    if (step === 2) {
      const t = setTimeout(() => setStep(0), 3000);
      return () => clearTimeout(t);
    }
  }, [step]);

  return (
    <PhoneFrame>
      <div className="flex items-center gap-2 pb-2 mb-2 border-b border-border/40">
        <div className="h-7 w-7 rounded-full bg-[#25D366] flex items-center justify-center">
          <Phone className="h-3.5 w-3.5 text-white" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-foreground">Connect WhatsApp</p>
          <p className="text-[9px] text-muted-foreground">Quick setup • 30 seconds</p>
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <p className="text-[10px] text-muted-foreground text-center">Enter your WhatsApp number</p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-2">
                <span className="text-[11px] text-muted-foreground">+44</span>
                <div className="h-3.5 w-px bg-border" />
                <span className="text-[11px] text-foreground">7575 477 937</span>
                <motion.div className="h-3.5 w-px bg-primary" animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
              </div>
              <div className="w-full rounded-lg bg-[#25D366] py-2 text-[10px] font-semibold text-white text-center flex items-center justify-center gap-1">
                <MessageSquare className="h-3 w-3" /> Connect Now
              </div>
            </motion.div>
          )}
          {step === 1 && (
            <motion.div key="connecting" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3 py-4">
              <motion.div className="h-10 w-10 rounded-full border-2 border-[#25D366] border-t-transparent" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} />
              <p className="text-[10px] text-muted-foreground">Connecting…</p>
            </motion.div>
          )}
          {step === 2 && (
            <motion.div key="connected" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-2 py-4">
              <motion.div className="h-12 w-12 rounded-full bg-[#25D366] flex items-center justify-center" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
                <Check className="h-6 w-6 text-white" />
              </motion.div>
              <p className="text-xs font-bold text-foreground">WhatsApp Connected!</p>
              <p className="text-[10px] text-muted-foreground text-center">Your AI agent is now live 24/7</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PhoneFrame>
  );
}

function TrainingPreview() {
  const sources = [
    { icon: Globe, label: "Website URL", status: "synced", count: "24 pages" },
    { icon: FileText, label: "PDF Documents", status: "synced", count: "3 files" },
    { icon: MessageSquare, label: "WhatsApp Chats", status: "synced", count: "156 conversations" },
    { icon: Image, label: "Product Images", status: "processing", count: "12 images" },
    { icon: ShoppingBag, label: "Shopify Store", status: "synced", count: "48 products" },
  ];
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Knowledge Sources</p>
      {sources.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-center gap-3 rounded-lg bg-muted/50 p-2.5"
        >
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <s.icon className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">{s.label}</p>
            <p className="text-[10px] text-muted-foreground">{s.count}</p>
          </div>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
            s.status === "synced" ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-600"
          }`}>
            {s.status === "synced" ? "✓ Synced" : "⟳ Processing"}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function ControlPreview() {
  const [msgIdx, setMsgIdx] = useState(0);
  const conversation = [
    { from: "user" as const, text: "📊 Show today's stats" },
    { from: "bot" as const, text: "Today: 12 chats, 3 orders, $240 revenue 📈" },
    { from: "user" as const, text: "➕ Add product: Premium Candle $29" },
    { from: "bot" as const, text: "✅ 'Premium Candle' added at $29." },
    { from: "user" as const, text: "📅 Block tomorrow 2-4pm" },
    { from: "bot" as const, text: "Done! Blocked 2:00–4:00 PM ✓" },
  ];
  const visible = conversation.slice(0, msgIdx + 1);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setMsgIdx(i => (i >= conversation.length - 1 ? 0 : i + 1));
    }, msgIdx >= conversation.length - 1 ? 2500 : 1200);
    return () => clearTimeout(t);
  }, [msgIdx, conversation.length]);

  return (
    <PhoneFrame>
      <div className="flex items-center gap-2 pb-2 mb-2 border-b border-border/40">
        <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center">
          <Bot className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-foreground">Management Assistant</p>
          <p className="text-[9px] text-[#25D366]">● Online</p>
        </div>
      </div>
      <div className="flex-1 space-y-1.5 overflow-hidden">
        <AnimatePresence>
          {visible.map((m, i) => (
            <motion.div
              key={`${msgIdx}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[85%] rounded-xl px-2.5 py-1.5 text-[10px] leading-relaxed ${
                m.from === "user"
                  ? "bg-[#DCF8C6] text-foreground rounded-tr-sm"
                  : "bg-muted text-foreground rounded-tl-sm"
              }`}>
                {m.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </PhoneFrame>
  );
}

function FollowUpPreview() {
  const timeline = [
    { time: "0h", label: "Customer goes inactive", active: false },
    { time: "2h", label: "Auto follow-up #1 sent", active: true },
    { time: "24h", label: "Follow-up #2 with offer", active: true },
    { time: "24h+", label: "Customer re-engaged! 🎉", active: true },
  ];
  return (
    <div className="space-y-0">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">Auto Re-engagement Flow</p>
      {timeline.map((t, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.15 }}
          className="flex gap-3 items-start"
        >
          <div className="flex flex-col items-center">
            <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              t.active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {t.active ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            {i < timeline.length - 1 && <div className="w-px h-6 bg-border" />}
          </div>
          <div className="pb-4">
            <p className="text-xs font-medium text-foreground">{t.label}</p>
            <p className="text-[10px] text-muted-foreground">{t.time}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function OrdersPreview() {
  const items = [
    { icon: Package, label: "Order #1042", sub: "2x T-Shirt — $48", status: "Confirmed" },
    { icon: Calendar, label: "Booking #87", sub: "Haircut — Tomorrow 3pm", status: "Pending" },
    { icon: Users, label: "Inquiry #203", sub: "Return request", status: "Open" },
  ];
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent Activity</p>
      {items.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-center gap-3 rounded-lg bg-muted/50 p-2.5"
        >
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <item.icon className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">{item.label}</p>
            <p className="text-[10px] text-muted-foreground">{item.sub}</p>
          </div>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{item.status}</span>
        </motion.div>
      ))}
    </div>
  );
}

function PaymentsPreview() {
  const [sent, setSent] = useState(false);
  return (
    <div className="flex flex-col h-full">
      <div className="space-y-2 flex-1">
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-foreground mb-1">Customer: "I'd like to pay for Order #1042"</p>
        </div>
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
          <p className="text-xs text-foreground mb-2">AI Agent: "Here's your payment link!"</p>
          <AnimatePresence>
            {sent && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-lg bg-card border border-border p-2.5"
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-[11px] font-semibold text-foreground">Pay $48.00</p>
                    <p className="text-[10px] text-primary underline">stripe.com/pay/...</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {!sent ? (
        <button
          onClick={() => setSent(true)}
          className="mt-3 flex items-center gap-1.5 self-center rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
        >
          Send payment link <CreditCard className="h-3 w-3" />
        </button>
      ) : (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-center text-[11px] font-medium text-primary">
          ✅ Payment link sent!
        </motion.p>
      )}
    </div>
  );
}

function MultimodalPreview() {
  const inputs = [
    { icon: Mic, label: "Voice Note", example: "🎤 0:12 — \"What time do you close?\"", response: "We're open until 8 PM today!" },
    { icon: Image, label: "Photo", example: "📷 [Product image sent]", response: "That's our Premium Watch — $299. Want to order?" },
    { icon: MessageSquare, label: "Text", example: "Do you deliver to London?", response: "Yes! Free delivery for orders over £50." },
  ];
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="flex gap-1.5 mb-4">
        {inputs.map((inp, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
              active === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <inp.icon className="h-3 w-3" /> {inp.label}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-2"
        >
          <div className="rounded-lg bg-[#25D366]/10 p-2.5">
            <p className="text-xs text-foreground">{inputs[active].example}</p>
          </div>
          <div className="rounded-lg bg-muted p-2.5 flex gap-2 items-start">
            <Bot className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-foreground">{inputs[active].response}</p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function AnalyticsPreview() {
  const bars = [65, 42, 88, 55, 72, 90, 78];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Conversations This Week</p>
      <div className="flex items-end gap-2 h-24 mb-2">
        {bars.map((h, i) => (
          <motion.div
            key={i}
            className="flex-1 rounded-t-md bg-primary/20 relative group cursor-pointer"
            initial={{ height: 0 }}
            whileInView={{ height: `${h}%` }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
            whileHover={{ backgroundColor: "hsl(var(--primary) / 0.4)" }}
          >
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              {h}
            </span>
          </motion.div>
        ))}
      </div>
      <div className="flex gap-2">
        {days.map(d => (
          <p key={d} className="flex-1 text-center text-[9px] text-muted-foreground">{d}</p>
        ))}
      </div>
      <div className="flex gap-3 mt-4">
        {[
          { label: "Leads", value: "127", trend: "+18%" },
          { label: "Converted", value: "34", trend: "+7%" },
        ].map(s => (
          <div key={s.label} className="flex-1 rounded-lg bg-muted/50 p-2">
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
            <p className="text-sm font-bold text-foreground">{s.value} <span className="text-[10px] text-primary font-medium">{s.trend}</span></p>
          </div>
        ))}
      </div>
    </div>
  );
}

function HandoverPreview() {
  const steps = [
    { label: "AI handles initial query", icon: Bot },
    { label: "Complex issue detected", icon: Target },
    { label: "Routed to human agent", icon: UserCheck },
  ];
  const [step, setStep] = useState(0);
  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <motion.div
              className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
              animate={i === step ? { scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 0.5 }}
            >
              <s.icon className="h-3.5 w-3.5" />
            </motion.div>
            {i < steps.length - 1 && (
              <div className={`h-px flex-1 transition-colors ${i < step ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={step}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="text-xs text-center text-muted-foreground mb-4"
        >
          {steps[step].label}
        </motion.p>
      </AnimatePresence>
      <button
        onClick={() => setStep(s => (s + 1) % steps.length)}
        className="mx-auto flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
      >
        {step < steps.length - 1 ? "Next step" : "Replay"} <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}

const previewMap: Record<string, () => JSX.Element> = {
  whatsapp: WhatsAppPreview,
  training: TrainingPreview,
  control: ControlPreview,
  followup: FollowUpPreview,
  orders: OrdersPreview,
  payments: PaymentsPreview,
  multimodal: MultimodalPreview,
  analytics: AnalyticsPreview,
  handover: HandoverPreview,
};

export default function FeaturesSection() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const ActivePreview = previewMap[features[active].preview];

  const goNext = () => setActive(i => (i + 1) % features.length);
  const goPrev = () => setActive(i => (i - 1 + features.length) % features.length);

  // Auto-advance every 5s unless paused
  React.useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setActive(i => (i + 1) % features.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [paused]);

  return (
    <section id="features" className="bg-background py-14 lg:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <motion.h2
          className="mb-10 text-center font-display text-2xl font-bold text-foreground md:mb-14 md:text-3xl lg:text-4xl"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Your Digital Team, Available{" "}
          <span className="text-primary">24/7</span>
        </motion.h2>

        <div
          className="flex flex-col lg:flex-row gap-4 lg:gap-10"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Feature tabs - horizontal scroll on mobile, vertical list on desktop */}
          <div className="lg:w-5/12">
            {/* Mobile: icon pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 lg:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
              {features.map((f, i) => (
                <button
                  key={f.title}
                  onClick={() => { setActive(i); setPaused(true); }}
                  className={`relative flex items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-medium whitespace-nowrap shrink-0 transition-all ${
                    active === i
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <f.icon className="h-3 w-3" />
                  {f.title.split(/[(&]/)[0].trim()}
                  {active === i && !paused && (
                    <motion.div
                      className="absolute bottom-0 left-0 h-[2px] bg-primary-foreground/50 rounded-full"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 5, ease: "linear" }}
                      key={`mp-${active}`}
                    />
                  )}
                </button>
              ))}
            </div>
            {/* Desktop: full list */}
            <div className="hidden lg:flex lg:flex-col gap-2">
              {features.map((f, i) => (
                <motion.button
                  key={f.title}
                  onClick={() => { setActive(i); setPaused(true); }}
                  className={`relative flex items-center gap-3 rounded-xl p-3 text-left transition-all overflow-hidden ${
                    active === i
                      ? "bg-primary/10 border border-primary/30 shadow-sm"
                      : "bg-card border border-transparent hover:bg-muted/50"
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                    active === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    <f.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold truncate ${active === i ? "text-foreground" : "text-muted-foreground"}`}>
                      {f.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">{f.desc.slice(0, 50)}…</p>
                  </div>
                  {active === i && !paused && (
                    <motion.div
                      className="absolute bottom-0 left-0 h-[2px] bg-primary"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 5, ease: "linear" }}
                      key={`dp-${active}`}
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Interactive preview */}
          <div className="lg:w-7/12 lg:sticky lg:top-20 lg:self-start">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
                className="rounded-2xl border border-border/50 bg-card p-4 md:p-6 card-shadow flex flex-col min-h-[420px] lg:min-h-[580px]"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-sm font-bold text-foreground md:text-lg truncate">
                      {features[active].title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                      {features[active].desc}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <button
                      onClick={() => { goPrev(); setPaused(true); }}
                      className="h-7 w-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                    >
                      <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => { goNext(); setPaused(true); }}
                      className="h-7 w-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                    >
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-full">
                    <ActivePreview />
                  </div>
                </div>
                {/* Dots */}
                <div className="flex justify-center gap-1 mt-3 pt-3 border-t border-border/30">
                  {features.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => { setActive(i); setPaused(true); }}
                      className={`h-1.5 rounded-full transition-all ${
                        i === active ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
