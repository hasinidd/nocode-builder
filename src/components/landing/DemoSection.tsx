import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, Bot } from "lucide-react";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

const chat1 = [
  { role: "user", text: "Do you have this item?" },
  { role: "bot", text: "Yes, it's available. Want me to place the order?" },
  { role: "user", text: "Yes" },
  { role: "bot", text: "Done. Order confirmed. ✅" },
];

const chat2Tabs: Record<string, { role: string; text: string }[]> = {
  "Instant replies": [
    { role: "user", text: "What are your working hours?" },
    { role: "bot", text: "We're open Mon–Sat, 9 AM to 6 PM. How can I help you today?" },
  ],
  "Order confirmations": [
    { role: "user", text: "I'd like to order 2x large pizza" },
    { role: "bot", text: "Order placed! 2x Large Pizza — Total: $24.99. Delivery in ~30 mins. ✅" },
  ],
  "FAQ handling": [
    { role: "user", text: "Do you offer refunds?" },
    { role: "bot", text: "Yes! We offer full refunds within 14 days of purchase. Would you like to start a return?" },
  ],
  "Lead qualification": [
    { role: "user", text: "I'm interested in your enterprise plan" },
    { role: "bot", text: "Great! Can I get your company name and team size? I'll connect you with our sales team." },
  ],
};

const stats = [
  { label: "WhatsApp connection", value: "under 30 sec" },
  { label: "Full setup", value: "under 5 minutes" },
];

export default function DemoSection() {
  const [activeTab, setActiveTab] = useState("Instant replies");

  return (
    <section id="how-it-works" className="section-mint py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-6">
        <motion.p
          className="text-sm font-semibold text-primary uppercase tracking-widest text-center mb-2"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        >
          How It Works
        </motion.p>
        <motion.h2
          className="font-display text-3xl md:text-4xl font-bold text-center text-foreground mb-14"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        >
          Watch It Work — Live
        </motion.h2>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Chat 1 */}
          <motion.div className="bg-card rounded-2xl border border-border card-shadow overflow-hidden" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <div className="bg-primary/5 px-5 py-3 border-b border-border flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center">
                <Bot className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">Sales Conversation</p>
            </div>
            <div className="p-5 space-y-3">
              {chat1.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`} style={{ animation: `type-in 0.4s ease-out ${0.5 + i * 0.5}s both` }}>
                  <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-xs ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-secondary-foreground rounded-bl-md"}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Chat 2 with tabs */}
          <motion.div className="bg-card rounded-2xl border border-border card-shadow overflow-hidden" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ delay: 0.1 }}>
            <div className="bg-primary/5 px-5 py-3 border-b border-border">
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(chat2Tabs).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      activeTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-primary/10"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-5 space-y-3 min-h-[140px]">
              {chat2Tabs[activeTab].map((msg, i) => (
                <div key={`${activeTab}-${i}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`} style={{ animation: `type-in 0.4s ease-out ${i * 0.4}s both` }}>
                  <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-xs ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-secondary-foreground rounded-bl-md"}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.p className="text-xl font-bold text-foreground text-center mb-10" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          Instant replies. Real conversions.
        </motion.p>

        <div className="flex flex-wrap justify-center gap-6 mb-6">
          {stats.map((s) => (
            <motion.div key={s.label} className="bg-card rounded-xl border border-border card-shadow px-6 py-4 flex items-center gap-3" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <Zap className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-sm font-bold text-foreground">{s.value}</p>
              </div>
            </motion.div>
          ))}
        </div>
        <motion.p className="text-sm font-bold text-primary text-center" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          Live before others finish setup.
        </motion.p>
      </div>
    </section>
  );
}
