import { motion } from "framer-motion";
import {
  MessageSquare, ShoppingCart, DollarSign,
  FileText, Image, MessagesSquare
} from "lucide-react";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

const youGive = [
  { icon: FileText, label: "PDFs" },
  { icon: Image, label: "Images" },
  { icon: MessagesSquare, label: "Chats" },
];
const youGet = [
  { icon: MessageSquare, label: "AI replies" },
  { icon: ShoppingCart, label: "Orders handled" },
  { icon: DollarSign, label: "Sales generated" },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-background">
      <div className="max-w-7xl mx-auto px-6">

        {/* ── Give Data → Get a Working System ── */}
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          <motion.h3 variants={fadeUp} className="font-display text-2xl md:text-3xl font-bold text-center text-foreground mb-10">
            Give Data. <span className="text-primary">Get a Working System.</span>
          </motion.h3>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <motion.div variants={fadeUp} className="bg-card border border-border rounded-2xl p-6 card-shadow">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">You give</p>
              <div className="space-y-3">
                {youGive.map((item, i) => (
                  <motion.div
                    key={item.label}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            <motion.div variants={fadeUp} className="bg-card border border-primary/20 rounded-2xl p-6 card-shadow">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-4">You get</p>
              <div className="space-y-3">
                {youGet.map((item, i) => (
                  <motion.div
                    key={item.label}
                    className="flex items-center gap-3 p-3 rounded-xl bg-primary/5"
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <item.icon className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
