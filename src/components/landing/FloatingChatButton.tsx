import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, Send, ChevronRight, X, Maximize2, Minimize2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const faqs = [
  "Do I need coding skills to use it?",
  "How much does it cost?",
  "Does it support voice notes, images, and files?",
  "Can I take over chats manually?",
];

const faqAnswers: Record<string, string> = {
  "Do I need coding skills to use it?":
    "Not at all! BuildStart is 100% no-code. You set up your agent just by chatting — describe your business, and the AI agent builds itself.",
  "How much does it cost?":
    "We offer a free tier to get started, plus affordable plans that scale with your usage. Check our pricing section above for details!",
  "Does it support voice notes, images, and files?":
    "Yes! Your customers can send voice notes, images, and documents via WhatsApp or web chat, and the AI understands them all.",
  "Can I take over chats manually?":
    "Absolutely. You can pause the AI agent on any conversation and reply manually from the dashboard or directly from WhatsApp.",
};

type Msg = { role: "user" | "assistant"; content: string };

export default function FloatingChatButton() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFaqs, setShowFaqs] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Click outside → minimize (not close)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Ignore clicks on the toggle button itself
      if (target.closest("[data-chat-toggle]")) return;
      if (chatRef.current && !chatRef.current.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleFaqClick = (q: string) => {
    const answer = faqAnswers[q] || "Thanks for asking! Our team will get back to you shortly.";
    setMessages((prev) => [
      ...prev,
      { role: "user", content: q },
      { role: "assistant", content: answer },
    ]);
    setShowFaqs(false);
  };

  const sendToAI = useCallback(async (text: string) => {
    setLoading(true);
    try {
      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const { data, error } = await supabase.functions.invoke("landing-chat", {
        body: { message: text, history },
      });
      const reply = data?.reply || "Thanks for your interest! Sign up to explore BuildStart. 🚀";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I'm having trouble right now. Please try again!" },
      ]);
    } finally {
      setLoading(false);
    }
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || loading) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setShowFaqs(false);
    sendToAI(text);
  };

  // Expand grows horizontally only — height stays the same
  const baseW = expanded ? "w-[520px]" : "w-[360px]";
  const baseH = "h-[480px]";

  return (
    <>
      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={chatRef}
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className={`fixed bottom-24 right-6 z-50 ${baseW} max-w-[calc(100vw-2rem)] ${baseH} flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center">
                  <Bot className="h-4.5 w-4.5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground leading-tight">BuildStart Agent</p>
                  <p className="text-[11px] text-muted-foreground">Always online</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
                  title={expanded ? "Smaller" : "Larger"}
                >
                  {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Welcome */}
              {messages.length === 0 && showFaqs && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="rounded-full bg-primary/20 p-1.5 h-7 w-7 flex items-center justify-center shrink-0">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="bg-secondary rounded-xl px-3 py-2 text-sm text-foreground">
                      Hi there! 👋 I'm the BuildStart Agent. How can I help you today?
                    </div>
                  </div>
                </div>
              )}

              {/* FAQ cards — show when no messages yet */}
              {showFaqs && messages.length === 0 && (
                <div className="space-y-2 mt-2">
                  {faqs.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleFaqClick(q)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-secondary/60 hover:bg-secondary border border-border/40 transition-colors text-left group"
                    >
                      <span className="text-sm text-foreground">{q}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                    </button>
                  ))}
                </div>
              )}

              {/* Messages */}
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                  {msg.role === "assistant" && (
                    <div className="rounded-full bg-primary/20 p-1.5 h-7 w-7 flex items-center justify-center shrink-0">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                  <div
                    className={`rounded-xl px-3 py-2 max-w-[80%] text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {loading && (
                <div className="flex gap-2">
                  <div className="rounded-full bg-primary/20 p-1.5 h-7 w-7 flex items-center justify-center shrink-0">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="bg-secondary rounded-xl px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Typing...
                  </div>
                </div>
              )}

              {/* Show FAQ cards again after messages */}
              {!showFaqs && messages.length > 0 && (
                <button
                  onClick={() => setShowFaqs(true)}
                  className="text-xs text-primary hover:underline"
                >
                  Show suggested questions
                </button>
              )}
              {showFaqs && messages.length > 0 && (
                <div className="space-y-2 mt-1">
                  {faqs
                    .filter((q) => !messages.some((m) => m.role === "user" && m.content === q))
                    .map((q) => (
                      <button
                        key={q}
                        onClick={() => handleFaqClick(q)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-secondary/60 hover:bg-secondary border border-border/40 transition-colors text-left group"
                      >
                        <span className="text-sm text-foreground">{q}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                      </button>
                    ))}
                </div>
              )}

              <div ref={scrollRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border p-3">
              <div className="flex gap-2 items-center">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type a message..."
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
                  disabled={loading}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <button
        data-chat-toggle
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        aria-label="Chat with BuildStart Agent"
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <Bot className="h-6 w-6" />
        )}
      </button>
    </>
  );
}
