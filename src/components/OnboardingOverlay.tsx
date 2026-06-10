import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Plus, Settings, BarChart3, MessageSquare, Zap, ChevronRight, ChevronLeft, X, Sparkles, Rocket, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface OnboardingStep {
  target: string; // CSS selector
  title: string;
  description: string;
  icon: React.ReactNode;
  position: "bottom" | "top" | "left" | "right";
  action?: string;
}

const STEPS: OnboardingStep[] = [
  {
    target: "[data-onboard='header']",
    title: "Welcome to BuildStart",
    description: "This is your command center. From here you can manage all your AI agents, track conversations, and grow your business.",
    icon: <Sparkles className="h-5 w-5" />,
    position: "bottom",
  },
  {
    target: "[data-onboard='stats']",
    title: "Your Dashboard Stats",
    description: "Keep an eye on your key metrics — total agents, active agents, and conversation counts update in real-time.",
    icon: <Zap className="h-5 w-5" />,
    position: "bottom",
  },
  {
    target: "[data-onboard='new-agent']",
    title: "Create Your First Agent",
    description: "Click here to build a new AI agent. Choose from support bots, booking agents, order handlers, and more!",
    icon: <Plus className="h-5 w-5" />,
    position: "bottom",
    action: "Create your first agent after this tour!",
  },
  {
    target: "[data-onboard='agent-list']",
    title: "Your Agents Live Here",
    description: "All your created agents appear in this list. You can edit, manage, chat with, or view analytics for each agent.",
    icon: <Bot className="h-5 w-5" />,
    position: "top",
  },
  {
    target: "[data-onboard='settings']",
    title: "Settings & Profile",
    description: "Customize your account, update your profile, and configure preferences from the settings page.",
    icon: <Settings className="h-5 w-5" />,
    position: "bottom",
  },
];

function getRect(selector: string): DOMRect | null {
  const el = document.querySelector(selector);
  return el ? el.getBoundingClientRect() : null;
}

function getTooltipStyle(rect: DOMRect, position: string) {
  const margin = 16;
  const tooltipW = 380;
  const tooltipH = 220;

  let top = 0;
  let left = 0;

  switch (position) {
    case "bottom":
      top = rect.bottom + margin;
      left = rect.left + rect.width / 2 - tooltipW / 2;
      break;
    case "top":
      top = rect.top - tooltipH - margin;
      left = rect.left + rect.width / 2 - tooltipW / 2;
      break;
    case "left":
      top = rect.top + rect.height / 2 - tooltipH / 2;
      left = rect.left - tooltipW - margin;
      break;
    case "right":
      top = rect.top + rect.height / 2 - tooltipH / 2;
      left = rect.right + margin;
      break;
  }

  // Clamp to viewport
  left = Math.max(16, Math.min(left, window.innerWidth - tooltipW - 16));
  top = Math.max(16, Math.min(top, window.innerHeight - tooltipH - 16));

  return { top, left, width: tooltipW };
}

export default function OnboardingOverlay({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [showFinale, setShowFinale] = useState(false);

  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  const updatePosition = useCallback(() => {
    const rect = getRect(current.target);
    setTargetRect(rect);
    if (rect) {
      setTooltipPos(getTooltipStyle(rect, current.position));
    }
  }, [current]);

  useEffect(() => {
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [updatePosition]);

  const goNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      setShowFinale(true);
      setTimeout(() => onComplete(), 2500);
    }
  };

  const goPrev = () => {
    if (step > 0) setStep(step - 1);
  };

  if (showFinale) {
    return (
      <motion.div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 15, stiffness: 200 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <PartyPopper className="h-20 w-20 text-primary mx-auto mb-4" />
          </motion.div>
          <h2 className="font-display text-3xl font-bold mb-2">You're All Set!</h2>
          <p className="text-muted-foreground text-lg">Time to build your first AI agent 🚀</p>
        </motion.div>
      </motion.div>
    );
  }

  const pad = 8;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9998]" onClick={(e) => e.stopPropagation()}>
        {/* Dark overlay with spotlight cutout */}
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
          <defs>
            <mask id="onboard-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - pad}
                  y={targetRect.top - pad}
                  width={targetRect.width + pad * 2}
                  height={targetRect.height + pad * 2}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="hsl(var(--background))"
            fillOpacity="0.75"
            mask="url(#onboard-mask)"
            style={{ pointerEvents: "auto" }}
          />
        </svg>

        {/* Highlight ring */}
        {targetRect && (
          <motion.div
            className="absolute border-2 border-primary rounded-xl pointer-events-none"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            style={{
              top: targetRect.top - pad,
              left: targetRect.left - pad,
              width: targetRect.width + pad * 2,
              height: targetRect.height + pad * 2,
              boxShadow: "0 0 0 4px hsl(var(--primary) / 0.2), 0 0 20px hsl(var(--primary) / 0.15)",
            }}
          >
            <motion.div
              className="absolute inset-0 rounded-xl border-2 border-primary/40"
              animate={{ scale: [1, 1.04, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
        )}

        {/* Tooltip card */}
        {tooltipPos && (
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="absolute z-[9999]"
            style={{ top: tooltipPos.top, left: tooltipPos.left, width: tooltipPos.width }}
          >
            <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
              {/* Progress bar */}
              <div className="px-4 pt-4">
                <Progress value={progress} className="h-1.5 bg-muted" />
              </div>

              <div className="p-5">
                {/* Step badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary">
                    {current.icon}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    Step {step + 1} of {STEPS.length}
                  </span>
                </div>

                <h3 className="font-display text-lg font-bold mb-1.5">{current.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-1">{current.description}</p>

                {current.action && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-primary">
                    <Rocket className="h-3.5 w-3.5" />
                    {current.action}
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-muted/30">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={onComplete}
                >
                  Skip tour
                </Button>
                <div className="flex items-center gap-2">
                  {step > 0 && (
                    <Button variant="outline" size="sm" onClick={goPrev} className="gap-1">
                      <ChevronLeft className="h-3.5 w-3.5" /> Back
                    </Button>
                  )}
                  <Button size="sm" onClick={goNext} className="gap-1 bg-primary hover:bg-primary/90">
                    {step === STEPS.length - 1 ? "Finish" : "Next"} <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Close button */}
        <button
          onClick={onComplete}
          className="absolute top-4 right-4 z-[9999] p-2 rounded-full bg-card border border-border hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </AnimatePresence>
  );
}
