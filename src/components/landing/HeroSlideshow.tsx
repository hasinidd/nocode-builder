import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  ShoppingCart, CalendarCheck, HelpCircle, Wand2, Globe, FileUp,
  MessageSquare, Check, Send, Trash2, Package,
} from "lucide-react";
import whatsappLogo from "@/assets/whatsapp-logo.png";
import buildstartIcon from "@/assets/buildstart-icon.png";

const SLIDE_COUNT = 5;
const SLIDE_DURATION = 6000;

/* ─── Slide 1: Select Agent Type ─── */
function Slide1() {
  const [selected, setSelected] = useState<number | null>(null);
  const types = [
    { icon: ShoppingCart, label: "Order Management", desc: "Sell products via chat" },
    { icon: CalendarCheck, label: "Booking Management", desc: "Schedule appointments" },
    { icon: HelpCircle, label: "Inquiry Handling", desc: "Answer questions & collect leads" },
  ];
  useEffect(() => {
    const t = setTimeout(() => setSelected(0), 1200);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 sm:px-6 py-6 sm:py-8">
      <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Step 1</motion.p>
      <motion.h3 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-base sm:text-lg font-bold text-foreground mb-4 sm:mb-6">Select Agent Type</motion.h3>
      <div className="space-y-3 w-full max-w-[300px]">
        {types.map((t, i) => (
          <motion.button
            key={t.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.15 }}
            onClick={() => setSelected(i)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
              selected === i
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-card hover:border-primary/30"
            }`}
          >
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
              selected === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              <t.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{t.label}</p>
              <p className="text-[11px] text-muted-foreground">{t.desc}</p>
            </div>
            {selected === i && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="ml-auto h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                <Check className="h-3 w-3 text-primary-foreground" />
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ─── Slide 2: Setup Method ─── */
function Slide2() {
  const [selected, setSelected] = useState<number | null>(null);
  const methods = [
    { icon: Wand2, label: "Start from scratch", desc: "Describe your business" },
    { icon: Globe, label: "Link a website", desc: "We'll extract everything" },
    { icon: FileUp, label: "Upload a PDF", desc: "Price lists, menus, catalogs" },
  ];
  useEffect(() => {
    const t = setTimeout(() => setSelected(1), 1500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 sm:px-6 py-6 sm:py-8">
      <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Step 2</motion.p>
      <motion.h3 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-base sm:text-lg font-bold text-foreground mb-4 sm:mb-6">Choose How to Start</motion.h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-[340px]">
        {methods.map((m, i) => (
          <motion.button
            key={m.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.15 }}
            onClick={() => setSelected(i)}
            className={`flex flex-row sm:flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border-2 transition-all ${
              selected === i
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/30"
            }`}
          >
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
              selected === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              <m.icon className="h-5 w-5" />
            </div>
            <div className="sm:text-center">
              <p className="text-[11px] font-semibold text-foreground leading-tight">{m.label}</p>
              <p className="text-[9px] text-muted-foreground">{m.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>
      {selected === 1 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 bg-card border border-border rounded-lg px-4 py-2 w-full max-w-[300px]">
          <p className="text-[11px] text-muted-foreground mb-1">Enter website URL</p>
          <p className="text-sm font-mono text-foreground">www.mystore.com<span className="animate-pulse text-primary">|</span></p>
        </motion.div>
      )}
    </div>
  );
}

/* ─── Slide 3: Configuration Chat ─── */
function Slide3() {
  const chat = [
    { role: "user", text: "I need a product purchasing agent" },
    { role: "bot", text: "What type of products do you sell?" },
    { role: "user", text: "Clothing" },
    { role: "bot", text: "Do you want to collect delivery details?" },
    { role: "user", text: "Yes" },
    { role: "bot", text: "What payment methods do you accept?" },
    { role: "user", text: "Cash on delivery & card" },
    { role: "bot", text: "✅ Agent configured! Your clothing store AI agent is ready with delivery collection and COD + card payments." },
  ];
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (count < chat.length) {
      const delay = chat[count].role === "bot" ? 900 : 600;
      const t = setTimeout(() => setCount(c => c + 1), delay);
      return () => clearTimeout(t);
    }
  }, [count, chat.length]);
  return (
    <div className="flex flex-col h-full">
      <div className="bg-primary/5 px-4 py-2.5 border-b border-border flex items-center gap-2">
        <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center">
          <img src={buildstartIcon} alt="BuildStart" className="h-3.5 w-3.5 object-contain" />
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">Configuration Assistant</p>
          <p className="text-[9px] text-primary">Setting up your agent...</p>
        </div>
      </div>
      <div className="flex-1 p-3 space-y-2 overflow-y-auto bg-muted/20">
        {chat.slice(0, count).map((msg, i) => (
          <motion.div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className={`max-w-[80%] px-3 py-1.5 rounded-xl text-[11px] leading-relaxed ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-card text-foreground rounded-bl-sm border border-border"
            }`}>
              {msg.text}
            </div>
          </motion.div>
        ))}
        {count < chat.length && count > 0 && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-xl px-3 py-2 flex gap-1">
              <motion.span className="h-1.5 w-1.5 bg-muted-foreground/50 rounded-full" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.5, repeat: Infinity, delay: 0 }} />
              <motion.span className="h-1.5 w-1.5 bg-muted-foreground/50 rounded-full" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.5, repeat: Infinity, delay: 0.12 }} />
              <motion.span className="h-1.5 w-1.5 bg-muted-foreground/50 rounded-full" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.5, repeat: Infinity, delay: 0.24 }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Slide 4: Connect WhatsApp ─── */
function Slide4() {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setConnected(true), 2500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 sm:px-6 py-6 sm:py-8">
      <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Step 4</motion.p>
      <motion.h3 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-base sm:text-lg font-bold text-foreground mb-6 sm:mb-8">Connect WhatsApp</motion.h3>
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 12, delay: 0.3 }}
        className="mb-6"
      >
        <img src={whatsappLogo} alt="WhatsApp" className="h-20 w-20" />
      </motion.div>
      <AnimatePresence mode="wait">
        {!connected ? (
          <motion.div key="connecting" className="flex flex-col items-center gap-3" exit={{ opacity: 0 }}>
            <motion.div
              className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <p className="text-sm text-muted-foreground">Connecting to WhatsApp...</p>
          </motion.div>
        ) : (
          <motion.div key="connected" className="flex flex-col items-center gap-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 10 }}
              className="h-14 w-14 rounded-full bg-primary flex items-center justify-center"
            >
              <Check className="h-7 w-7 text-primary-foreground" />
            </motion.div>
            <p className="text-sm font-bold text-foreground">WhatsApp Connected</p>
            <p className="text-xs text-muted-foreground">Your AI agent is now live!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Slide 5: Management Assistant ─── */
function Slide5() {
  const chat = [
    { role: "user", text: "Add 5 products: T-shirts, Hoodies, Jeans, Caps, Sneakers" },
    { role: "bot", text: "✅ 5 products added successfully!\n📦 T-shirts, Hoodies, Jeans, Caps, Sneakers" },
    { role: "user", text: "Remove product: Black Hoodie" },
    { role: "bot", text: "🗑️ Black Hoodie removed from your catalog" },
    { role: "user", text: "Send follow-up to pending orders" },
    { role: "bot", text: "📩 Follow-up messages sent to 12 customers with pending orders" },
  ];
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (count < chat.length) {
      const delay = chat[count].role === "bot" ? 1000 : 700;
      const t = setTimeout(() => setCount(c => c + 1), delay);
      return () => clearTimeout(t);
    }
  }, [count, chat.length]);
  return (
    <div className="flex flex-col h-full">
      <div className="bg-primary/5 px-4 py-2.5 border-b border-border flex items-center gap-2">
        <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center">
          <MessageSquare className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">Management Assistant</p>
          <p className="text-[9px] text-primary">Manage everything via chat</p>
        </div>
      </div>
      <div className="flex-1 p-3 space-y-2 overflow-y-auto bg-muted/20">
        {chat.slice(0, count).map((msg, i) => (
          <motion.div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className={`max-w-[80%] px-3 py-1.5 rounded-xl text-[11px] leading-relaxed whitespace-pre-line ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-card text-foreground rounded-bl-sm border border-border"
            }`}>
              {msg.text}
            </div>
          </motion.div>
        ))}
        {count < chat.length && count > 0 && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-xl px-3 py-2 flex gap-1">
              <motion.span className="h-1.5 w-1.5 bg-muted-foreground/50 rounded-full" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.5, repeat: Infinity, delay: 0 }} />
              <motion.span className="h-1.5 w-1.5 bg-muted-foreground/50 rounded-full" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.5, repeat: Infinity, delay: 0.12 }} />
              <motion.span className="h-1.5 w-1.5 bg-muted-foreground/50 rounded-full" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.5, repeat: Infinity, delay: 0.24 }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const SLIDES = [Slide1, Slide2, Slide3, Slide4, Slide5];
const SLIDE_LABELS = ["Agent Type", "Setup", "Configure", "Connect", "Manage"];

export default function HeroSlideshow() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setActive((prev) => (prev + 1) % SLIDE_COUNT);
    }, SLIDE_DURATION);
    return () => clearTimeout(timer);
  }, [active]);

  const SlideComponent = SLIDES[active];

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-0">
      <div className="bg-card rounded-2xl border border-border card-shadow overflow-hidden">
        {/* Progress bar + labels */}
        <div className="flex items-center gap-0.5 sm:gap-1 px-2 sm:px-4 py-2 sm:py-3 border-b border-border bg-muted/30">
          {SLIDE_LABELS.map((label, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className="flex-1 flex flex-col items-center gap-1 sm:gap-1.5 cursor-pointer group"
            >
              <div className="w-full h-1 rounded-full bg-border overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: "0%" }}
                  animate={{
                    width: i < active ? "100%" : i === active ? "100%" : "0%",
                  }}
                  transition={i === active ? { duration: SLIDE_DURATION / 1000, ease: "linear" } : { duration: 0.3 }}
                />
              </div>
              <span className={`text-[8px] sm:text-[10px] font-medium transition-colors ${
                i === active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              }`}>
                {label}
              </span>
            </button>
          ))}
        </div>

        {/* Slide content */}
        <div className="relative" style={{ minHeight: 320 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              className="absolute inset-0"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.35 }}
            >
              <SlideComponent />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
