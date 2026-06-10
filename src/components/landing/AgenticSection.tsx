import { motion } from "framer-motion";
import { Mic, FileText, Link2, Brain, Sparkles, Cpu, MessageSquare, Image, File } from "lucide-react";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

const giveItems = [
  { icon: MessageSquare, text: "Type your business" },
  { icon: Mic, text: "Speak your instructions (voice input)" },
  { icon: FileText, text: "Upload PDFs, images, chats" },
  { icon: Link2, text: "Add website links" },
];

const doesItems = [
  { icon: Sparkles, text: "Learns your tone" },
  { icon: Brain, text: "Understands your business" },
  { icon: Cpu, text: "Builds your smart agent" },
  { icon: Sparkles, text: "Improves continuously" },
];

export default function AgenticSection() {
  return (
    <section id="agentic" className="py-20 lg:py-28 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <motion.h2
          className="font-display text-3xl md:text-4xl font-bold text-center text-foreground mb-14"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        >
          Just Tell It What You Need
        </motion.h2>

        <div className="grid md:grid-cols-2 gap-8 mb-10">
          <motion.div className="bg-card rounded-2xl border border-border card-shadow p-8 card-hover" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <h3 className="font-display text-lg font-bold text-foreground mb-5">What You Give It</h3>
            <div className="space-y-4">
              {giveItems.map((it) => (
                <div key={it.text} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <it.icon className="h-4 w-4 text-primary" />
                  </div>
                  {it.text}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div className="bg-card rounded-2xl border border-border card-shadow p-8 card-hover" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ delay: 0.1 }}>
            <h3 className="font-display text-lg font-bold text-foreground mb-5">What BuildStart Does</h3>
            <div className="space-y-4">
              {doesItems.map((it) => (
                <div key={it.text} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <it.icon className="h-4 w-4 text-primary" />
                  </div>
                  {it.text}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.p className="text-xl lg:text-2xl font-bold text-primary text-center mb-14" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          It learns how YOU run your business.
        </motion.p>

        <div className="grid md:grid-cols-2 gap-8">
          <motion.div className="bg-card rounded-2xl border border-border card-shadow p-8 card-hover" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <h3 className="font-display text-lg font-bold text-foreground mb-4">Not Rule-Based — Intelligent</h3>
            <ul className="space-y-2 mb-4">
              {["Understands intent", "Adapts to context", "Makes decisions"].map((t) => (
                <li key={t} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {t}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mb-3">Supports: Text · Voice · Images · Documents</p>
            <p className="text-sm font-bold text-primary">This is intelligence, not automation.</p>
          </motion.div>

          <motion.div className="bg-card rounded-2xl border border-border card-shadow p-8 card-hover" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ delay: 0.1 }}>
            <h3 className="font-display text-lg font-bold text-foreground mb-4">Give Data. Get a Working System.</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">You give</p>
                <div className="space-y-1.5">
                  {[{ icon: FileText, t: "PDFs" }, { icon: Image, t: "Images" }, { icon: File, t: "Chats" }].map((it) => (
                    <div key={it.t} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <it.icon className="h-3.5 w-3.5 text-primary" /> {it.t}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">You get</p>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <p>AI replies</p>
                  <p>Orders handled</p>
                  <p>Sales generated</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
