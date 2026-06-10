import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const prompts = [
  "I have a salon, make a booking appointment AI agent via WhatsApp",
  "I have a Shopify store, need to sell via WhatsApp",
  "Upload my product PDF and start selling on WhatsApp",
  "Give a 10% discount to all my products",
  "I run Meta ads, manage my leads via WhatsApp",
  "Manage my AI agent features and settings",
  "Connect my website and sync my inventory",
  "Send follow-up messages to inactive customers",
  "Generate invoices and send them via WhatsApp",
  "Act as my personal assistant on WhatsApp",
];

export default function TypingPromptBox() {
  const [promptIndex, setPromptIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const current = prompts[promptIndex];
  const displayed = current.slice(0, charIndex);

  useEffect(() => {
    if (!isDeleting && charIndex < current.length) {
      const t = setTimeout(() => setCharIndex((c) => c + 1), 38);
      return () => clearTimeout(t);
    }
    if (!isDeleting && charIndex === current.length) {
      const t = setTimeout(() => setIsDeleting(true), 2000);
      return () => clearTimeout(t);
    }
    if (isDeleting && charIndex > 0) {
      const t = setTimeout(() => setCharIndex((c) => c - 1), 20);
      return () => clearTimeout(t);
    }
    if (isDeleting && charIndex === 0) {
      setIsDeleting(false);
      setPromptIndex((p) => (p + 1) % prompts.length);
    }
  }, [charIndex, isDeleting, current]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="w-full max-w-2xl mx-auto mb-8"
    >
      <div className="relative rounded-xl border border-border bg-card shadow-sm px-5 py-3.5 text-left min-h-[48px]">
        <span className="text-sm sm:text-base text-muted-foreground">
          {displayed}
        </span>
        <span className="inline-block w-0.5 h-4 sm:h-5 bg-primary align-middle ml-0.5 animate-pulse" />
      </div>
    </motion.div>
  );
}
