import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, ChevronRight, ChevronLeft, Sparkles, FileText, Globe, MessageSquare, Eye, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface GuideStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  targetSelector?: string; // CSS selector for spotlight
  spotlightPadding?: number;
}

const GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Sparkles className="h-6 w-6" />,
    title: "Welcome to the Configuration Assistant! 🤖",
    description: "I'm here to help you set up your AI agent. Let me show you around so you know exactly what each part does.",
  },
  {
    icon: <MessageSquare className="h-6 w-6" />,
    title: "Chat to Configure 💬",
    description: "This is your Configuration Assistant. Just answer its questions — it'll guide you through naming, tone, language, welcome message, and more. No complex forms!",
    targetSelector: "[data-guide='config-chat']",
    spotlightPadding: 8,
  },
  {
    icon: <FileText className="h-6 w-6" />,
    title: "Upload Docs & URLs 📄🌐",
    description: "Use the document (📄) and URL (🌐) buttons at the bottom of the chat to import content from files or websites. The assistant will automatically extract useful info.",
    targetSelector: "[data-guide='chat-input-area']",
    spotlightPadding: 8,
  },
  {
    icon: <Eye className="h-6 w-6" />,
    title: "Live Preview 📱",
    description: "This phone shows a real-time preview of your agent. As you configure through the chat, the preview updates instantly — see exactly how your bot will look and respond!",
    targetSelector: "[data-guide='phone-preview']",
    spotlightPadding: 8,
  },
  {
    icon: <Rocket className="h-6 w-6" />,
    title: "You're Ready! 🚀",
    description: "Start chatting with the assistant to configure your agent. When you're happy with the preview, hit 'Next: Deploy' to make it live. You can always come back to edit!",
  },
];

const STORAGE_KEY = "buildstart_config_guide_seen";

function getTargetRect(selector?: string): DOMRect | null {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  return el.getBoundingClientRect();
}

export default function ConfigGuideOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [showFloatingBtn, setShowFloatingBtn] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setIsOpen(true);
    } else {
      setShowFloatingBtn(true);
    }
  }, []);

  // Update spotlight position when step changes or on resize
  const updateSpotlight = useCallback(() => {
    const current = GUIDE_STEPS[step];
    setTargetRect(getTargetRect(current?.targetSelector));
  }, [step]);

  useEffect(() => {
    if (!isOpen) return;
    // Small delay to let DOM render
    const timer = setTimeout(updateSpotlight, 100);
    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight, true);
    };
  }, [isOpen, step, updateSpotlight]);

  const handleClose = () => {
    setIsOpen(false);
    setShowFloatingBtn(true);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  const handleOpen = () => {
    setStep(0);
    setIsOpen(true);
    setShowFloatingBtn(false);
  };

  const progress = ((step + 1) / GUIDE_STEPS.length) * 100;
  const current = GUIDE_STEPS[step];
  const pad = current.spotlightPadding || 0;
  const hasSpotlight = !!targetRect;

  // Calculate tooltip position relative to spotlight (always clamped to viewport)
  const getTooltipStyle = (): React.CSSProperties => {
    const margin = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobile = vw < 640;

    // On mobile, always center the tooltip card
    if (isMobile || !targetRect) {
      return { bottom: margin, left: margin, right: margin, position: "fixed" as const };
    }

    const gap = 16;
    const tooltipWidth = Math.min(380, vw - margin * 2);
    const tooltipHeight = 250;

    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
    const maxLeft = Math.max(margin, vw - tooltipWidth - margin);
    const maxTop = Math.max(margin, vh - tooltipHeight - margin);

    const centerX = (targetRect.left + targetRect.right) / 2;
    const centerY = (targetRect.top + targetRect.bottom) / 2;

    const candidates = [
      { top: centerY - tooltipHeight / 2, left: targetRect.right + pad + gap },
      { top: centerY - tooltipHeight / 2, left: targetRect.left - pad - gap - tooltipWidth },
      { top: targetRect.bottom + pad + gap, left: centerX - tooltipWidth / 2 },
      { top: targetRect.top - pad - gap - tooltipHeight, left: centerX - tooltipWidth / 2 },
    ];

    const fitsInViewport = (pos: { top: number; left: number }) =>
      pos.left >= margin &&
      pos.top >= margin &&
      pos.left + tooltipWidth <= vw - margin &&
      pos.top + tooltipHeight <= vh - margin;

    const best = candidates.find(fitsInViewport) || candidates[2];

    return {
      top: clamp(best.top, margin, maxTop),
      left: clamp(best.left, margin, maxLeft),
    };
  };

  return (
    <>
      {/* Full overlay with spotlight */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999]"
          >
            {/* Dimmed backdrop with spotlight cutout */}
            {hasSpotlight ? (
              <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "auto" }}>
                <defs>
                  <mask id="spotlight-mask">
                    <rect x="0" y="0" width="100%" height="100%" fill="white" />
                    <rect
                      x={targetRect!.left - pad}
                      y={targetRect!.top - pad}
                      width={targetRect!.width + pad * 2}
                      height={targetRect!.height + pad * 2}
                      rx="16"
                      fill="black"
                    />
                  </mask>
                </defs>
                <rect
                  x="0" y="0" width="100%" height="100%"
                  fill="hsl(var(--background) / 0.8)"
                  mask="url(#spotlight-mask)"
                  style={{ backdropFilter: "blur(4px)" }}
                />
              </svg>
            ) : (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
            )}

            {/* Spotlight ring */}
            {hasSpotlight && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute rounded-2xl border-2 border-primary/60 shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]"
                style={{
                  top: targetRect!.top - pad,
                  left: targetRect!.left - pad,
                  width: targetRect!.width + pad * 2,
                  height: targetRect!.height + pad * 2,
                  pointerEvents: "none",
                }}
              />
            )}

            {/* Tooltip card */}
            <motion.div
              key={step}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="absolute w-auto sm:w-[380px] max-w-[calc(100vw-24px)]"
              style={getTooltipStyle()}
            >
              <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
                {/* Progress */}
                <div className="px-5 pt-4">
                  <Progress value={progress} className="h-1.5 bg-muted" />
                </div>

                {/* Content */}
                <div className="p-5 pt-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                      {current.icon}
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {step + 1} of {GUIDE_STEPS.length}
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-bold mb-2">{current.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{current.description}</p>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between border-t border-border px-4 py-2.5 bg-muted/30">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground text-xs"
                    onClick={handleClose}
                  >
                    Skip
                  </Button>
                  <div className="flex items-center gap-2">
                    {step > 0 && (
                      <Button variant="outline" size="sm" onClick={() => setStep(s => s - 1)} className="gap-1 text-xs h-7">
                        <ChevronLeft className="h-3 w-3" /> Back
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => {
                        if (step < GUIDE_STEPS.length - 1) {
                          setStep(s => s + 1);
                        } else {
                          handleClose();
                        }
                      }}
                      className="gap-1 bg-primary hover:bg-primary/90 text-xs h-7"
                    >
                      {step === GUIDE_STEPS.length - 1 ? "Get Started" : "Next"} <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating help button */}
      <AnimatePresence>
        {showFloatingBtn && !isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 15, stiffness: 200 }}
            onClick={handleOpen}
            className="fixed bottom-6 right-6 z-[100] group"
            title="Show guide"
          >
            <div className="relative">
              <div className="rounded-full bg-primary p-3.5 shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-shadow">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </div>
              <motion.div
                className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-accent border-2 border-background"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
