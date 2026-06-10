import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { Bot, Check, Globe, FileText } from "lucide-react";
import whatsappLogo from "@/assets/whatsapp-logo.png";
import shopifyLogo from "@/assets/shopify-logo.png";
import woocommerceLogo from "@/assets/woocommerce-logo.png";
import googleCalendarIcon from "@/assets/google-calendar.svg";
import stripeLogo from "@/assets/stripe-logo.png";

type Scene = 1 | 2 | 3 | 4 | 5;
const SCENE_COUNT = 5;
const SCENE_DURATIONS: Record<Scene, number> = {
  1: 12000, 2: 9000, 3: 8000, 4: 7000, 5: 10000,
};

function ChatHeader({ title = "BuildStart", subtitle = "Online" }: { title?: string; subtitle?: string }) {
  return (
    <div className="bg-[#075E54] px-3 py-2 flex items-center gap-2">
      <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center">
        <Bot className="h-4 w-4 text-white" />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-white">{title}</p>
        <p className="text-[9px] text-white/70">{subtitle}</p>
      </div>
    </div>
  );
}

function BotBubble({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <motion.div className="flex justify-start" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.3 }}>
      <div className="max-w-[85%] px-3 py-1.5 rounded-xl rounded-bl-sm bg-white text-[10px] leading-relaxed text-foreground shadow-sm">{text}</div>
    </motion.div>
  );
}

function UserBubble({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <motion.div className="flex justify-end" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.3 }}>
      <div className="max-w-[85%] px-3 py-1.5 rounded-xl rounded-br-sm bg-[#DCF8C6] text-[10px] leading-relaxed text-foreground shadow-sm">{text}</div>
    </motion.div>
  );
}

function CheckItem({ text, delay }: { text: string; delay: number }) {
  return (
    <motion.div className="flex items-center gap-1.5" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay, duration: 0.3 }}>
      <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center shrink-0">
        <Check className="h-2.5 w-2.5 text-primary-foreground" />
      </div>
      <span className="text-[10px] text-foreground">{text}</span>
    </motion.div>
  );
}

function TypewriterText({ text, delay = 0, className = "" }: { text: string; delay?: number; className?: string }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        if (i < text.length) { setDisplayed(text.slice(0, i + 1)); i++; }
        else clearInterval(interval);
      }, 40);
      return () => clearInterval(interval);
    }, delay * 1000);
    return () => clearTimeout(timer);
  }, [text, delay]);
  return <span className={className}>{displayed}<span className="animate-pulse">|</span></span>;
}

// SCENE 1: Config AI agent asks business type → follow-up questions
function Scene1() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 3000),
      setTimeout(() => setStep(2), 5000),
      setTimeout(() => setStep(3), 7000),
      setTimeout(() => setStep(4), 9000),
      setTimeout(() => setStep(5), 10500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <motion.div className="absolute inset-0 flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <div className="bg-[#ECE5DD] flex-1 rounded-2xl overflow-hidden">
        <ChatHeader title="Config Agent" subtitle="Setting up..." />
        <div className="p-3 space-y-2 overflow-y-auto" style={{ maxHeight: 320 }}>
          <BotBubble text="👋 What is your business type?" delay={0.3} />
          {step >= 1 && <UserBubble text="I run a hair salon" delay={0} />}
          {step >= 2 && <BotBubble text="Great! What services do you offer?" delay={0} />}
          {step >= 3 && <BotBubble text="What are your working hours?" delay={0} />}
          {step >= 4 && <BotBubble text="Do you need online payments?" delay={0} />}
          {step >= 5 && (
            <motion.div className="flex items-center gap-1.5 mt-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <img src={googleCalendarIcon} alt="Google Calendar" className="h-4 w-4" />
              <span className="text-[9px] text-muted-foreground">Google Calendar sync available</span>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// SCENE 2: Website URL syncing + PDF price card syncing
function Scene2() {
  const [phase, setPhase] = useState<"website" | "pdf" | "done">("website");
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("pdf"), 3500);
    const t2 = setTimeout(() => setPhase("done"), 6500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-4 gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <AnimatePresence mode="wait">
        {phase === "website" && (
          <motion.div key="web" className="flex flex-col items-center gap-3 w-full" exit={{ opacity: 0 }}>
            <Globe className="h-8 w-8 text-primary" />
            <div className="bg-card border border-border rounded-lg px-3 py-2 w-full max-w-[240px]">
              <p className="text-[10px] text-foreground font-mono">www.mysalon.lk</p>
            </div>
            <motion.div className="w-48 h-1 bg-primary/30 rounded-full overflow-hidden">
              <motion.div className="h-full w-12 bg-primary rounded-full" animate={{ x: [0, 144, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} />
            </motion.div>
            <p className="text-[10px] text-muted-foreground">Syncing website data…</p>
          </motion.div>
        )}
        {phase === "pdf" && (
          <motion.div key="pdf" className="flex flex-col items-center gap-3 w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", damping: 12 }}>
              <FileText className="h-10 w-10 text-primary" />
            </motion.div>
            <p className="text-[10px] text-muted-foreground">📎 price-card.pdf uploaded</p>
            <motion.div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
            <p className="text-[10px] text-muted-foreground">Reading prices…</p>
          </motion.div>
        )}
        {phase === "done" && (
          <motion.div key="done" className="space-y-1.5 w-full max-w-[240px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <CheckItem text="Website services extracted" delay={0} />
            <CheckItem text="PDF prices detected" delay={0.3} />
            <CheckItem text="FAQs auto-generated" delay={0.6} />
            <CheckItem text="AI agent updated instantly" delay={0.9} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// SCENE 3: Shopify + WooCommerce integration
function Scene3() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 1500);
    const t2 = setTimeout(() => setStep(2), 3000);
    const t3 = setTimeout(() => setStep(3), 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-4 gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      {/* Shopify */}
      <motion.div className="flex items-center gap-3 w-full max-w-[240px]" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
        <img src={shopifyLogo} alt="Shopify" className="h-8 w-8 object-contain" />
        <div className="flex-1">
          <p className="text-[11px] font-semibold text-foreground">Shopify</p>
          {step >= 1 ? (
            <motion.p className="text-[9px] text-primary" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>✅ Store connected</motion.p>
          ) : (
            <motion.p className="text-[9px] text-muted-foreground" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1, repeat: Infinity }}>Connecting…</motion.p>
          )}
        </div>
      </motion.div>
      {/* WooCommerce */}
      <motion.div className="flex items-center gap-3 w-full max-w-[240px]" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 }}>
        <img src={woocommerceLogo} alt="WooCommerce" className="h-8 w-8 object-contain" />
        <div className="flex-1">
          <p className="text-[11px] font-semibold text-foreground">WooCommerce</p>
          {step >= 2 ? (
            <motion.p className="text-[9px] text-primary" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>✅ Products synced</motion.p>
          ) : step >= 1 ? (
            <motion.p className="text-[9px] text-muted-foreground" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1, repeat: Infinity }}>Syncing products…</motion.p>
          ) : null}
        </div>
      </motion.div>
      {step >= 3 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#ECE5DD] rounded-xl p-3 w-full max-w-[240px]">
          <BotBubble text="E-commerce ready! Customers can browse & buy via chat 🛒" delay={0} />
        </motion.div>
      )}
    </motion.div>
  );
}

// SCENE 4: Google Calendar integration
function Scene4() {
  const [phase, setPhase] = useState<"connect" | "done">("connect");
  useEffect(() => {
    const t = setTimeout(() => setPhase("done"), 2500);
    return () => clearTimeout(t);
  }, []);
  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-4 gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 12 }}>
        <img src={googleCalendarIcon} alt="Google Calendar" className="h-14 w-14" />
      </motion.div>
      <AnimatePresence mode="wait">
        {phase === "connect" ? (
          <motion.div key="connect" className="flex flex-col items-center gap-2" exit={{ opacity: 0 }}>
            <motion.div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
            <p className="text-[11px] font-medium text-foreground">Connecting Google Calendar…</p>
            <p className="text-[9px] text-muted-foreground">Enabling automatic scheduling</p>
          </motion.div>
        ) : (
          <motion.div key="done" className="space-y-1.5 w-full max-w-[240px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <CheckItem text="Google Calendar connected" delay={0} />
            <CheckItem text="Auto-scheduling enabled" delay={0.3} />
            <CheckItem text="Email invites activated" delay={0.6} />
            <CheckItem text="Real-time sync active" delay={0.9} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// SCENE 5: End-to-end flow — message → booking → calendar → notify → Stripe payment
function Scene5() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 1500),
      setTimeout(() => setStep(2), 3200),
      setTimeout(() => setStep(3), 4800),
      setTimeout(() => setStep(4), 6200),
      setTimeout(() => setStep(5), 7600),
      setTimeout(() => setStep(6), 8800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <motion.div className="absolute inset-0 flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <div className="bg-[#ECE5DD] flex-1 rounded-2xl overflow-hidden">
        <ChatHeader title="Salon Agent" subtitle="Active ✅" />
        <div className="p-3 space-y-2 overflow-y-auto" style={{ maxHeight: 320 }}>
          {step >= 0 && <UserBubble text="I want to book a haircut for tomorrow 3PM" delay={0.3} />}
          {step >= 1 && <BotBubble text="Sure! Haircut at 3PM tomorrow. Let me check availability… ✅ Slot available!" delay={0} />}
          {step >= 2 && (
            <motion.div className="flex items-center gap-1.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <img src={googleCalendarIcon} alt="" className="h-4 w-4" />
              <span className="text-[9px] text-primary font-medium">📅 Added to Google Calendar</span>
            </motion.div>
          )}
          {step >= 3 && <BotBubble text="Appointment confirmed! You'll receive an email invite shortly 📧" delay={0} />}
          {step >= 4 && (
            <motion.div className="flex items-center gap-1.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <img src={stripeLogo} alt="Stripe" className="h-4 w-auto object-contain" />
              <span className="text-[9px] text-primary font-medium">💳 Payment of $25 completed</span>
            </motion.div>
          )}
          {step >= 5 && <BotBubble text="All done! See you tomorrow at 3PM 💇‍♀️✨" delay={0} />}
          {step >= 6 && (
            <motion.div className="mt-2 bg-primary/10 rounded-lg px-3 py-2 text-center" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-[11px] font-bold text-primary">💰 Earn via WhatsApp</p>
              <p className="text-[9px] text-muted-foreground">Book, sell & get paid — all in one chat</p>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

const SCENES: Record<Scene, React.FC> = { 1: Scene1, 2: Scene2, 3: Scene3, 4: Scene4, 5: Scene5 };
const SCENE_LABELS = ["Setup", "Sync Data", "E-Commerce", "Calendar", "Live Demo"];

export default function HeroDemoSlider() {
  const [scene, setScene] = useState<Scene>(1);

  const advanceScene = useCallback(() => {
    setScene((prev) => ((prev % SCENE_COUNT) + 1) as Scene);
  }, []);

  useEffect(() => {
    const timer = setTimeout(advanceScene, SCENE_DURATIONS[scene]);
    return () => clearTimeout(timer);
  }, [scene, advanceScene]);

  const SceneComponent = SCENES[scene];

  return (
    <div className="w-full flex justify-center">
      {/* Mobile phone frame */}
      <div className="relative" style={{ width: 280 }}>
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-[#1a1a1a] rounded-b-2xl z-20" />
        {/* Phone body */}
        <div
          className="rounded-[2.5rem] border-[6px] border-[#1a1a1a] bg-[#1a1a1a] overflow-hidden"
          style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.05) inset" }}
        >
          {/* Screen area */}
          <div
            className="relative bg-background overflow-hidden rounded-[2rem]"
            style={{ height: 520 }}
          >
            <div className="absolute top-3 right-3 flex gap-1 z-10">
              {Array.from({ length: SCENE_COUNT }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setScene((i + 1) as Scene)}
                  className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer ${
                    i + 1 === scene ? "w-4 bg-primary" : "w-1.5 bg-border hover:bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
            <div className="absolute top-3 left-3 z-10">
              <AnimatePresence mode="wait">
                <motion.span
                  key={scene}
                  className="text-[9px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  {SCENE_LABELS[scene - 1]}
                </motion.span>
              </AnimatePresence>
            </div>
            <AnimatePresence mode="wait">
              <SceneComponent key={scene} />
            </AnimatePresence>
          </div>
        </div>
        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/30 rounded-full" />
      </div>
    </div>
  );
}
