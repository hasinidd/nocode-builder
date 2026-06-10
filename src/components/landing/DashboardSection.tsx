import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import buildstartIcon from "@/assets/buildstart-icon.png";
import dashboardPreview from "@/assets/dashboard-preview.png";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

const managementChat = [
  { role: "user" as const, text: "Change tone to professional" },
  { role: "bot" as const, text: "Done ✅ Assistant personality updated to Professional. All future responses will use formal language and structured replies." },
  { role: "user" as const, text: "Add a new product - Gold Necklace, Rs. 45,000" },
  { role: "bot" as const, text: "Product added ✅\n📦 Gold Necklace\n💰 Rs. 45,000\nCategory: Jewelry\nIt's now available for customers to order via chat!" },
  { role: "user" as const, text: "Update pricing for Silver Ring to Rs. 8,500" },
  { role: "bot" as const, text: "Updated ✅ Silver Ring price changed from Rs. 7,200 to Rs. 8,500. Active immediately." },
  { role: "user" as const, text: "Pause replies for 1 hour" },
  { role: "bot" as const, text: "Replies paused ⏸️ They will resume automatically in 1 hour at 3:45 PM. Incoming messages will be queued." },
];

function ManagementBotChat() {
  const [visibleCount, setVisibleCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visibleCount < managementChat.length) {
      const delay = managementChat[visibleCount]?.role === "bot" ? 1500 : 800;
      const timer = setTimeout(() => setVisibleCount((p) => p + 1), delay);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setVisibleCount(0), 4000);
    return () => clearTimeout(timer);
  }, [visibleCount]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [visibleCount]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card card-shadow">
      <div className="flex items-center gap-3 border-b border-border bg-primary/5 px-4 py-3 sm:px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary sm:h-8 sm:w-8">
          <img src={buildstartIcon} alt="BuildStart" className="h-3.5 w-3.5 object-contain sm:h-4 sm:w-4" />
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground sm:text-sm">Management Assistant</p>
          <p className="text-[10px] text-primary">Online ready to help</p>
        </div>
      </div>

      <div ref={containerRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
        {managementChat.slice(0, visibleCount).map((msg, i) => (
          <motion.div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {msg.role === "bot" && (
              <div className="mr-2 mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 sm:h-6 sm:w-6">
                <img src={buildstartIcon} alt="BuildStart" className="h-2.5 w-2.5 object-contain sm:h-3 sm:w-3" />
              </div>
            )}
            <div
              className={`max-w-[85%] whitespace-pre-line rounded-xl px-3 py-2 text-xs sm:max-w-[80%] sm:text-sm ${
                msg.role === "user"
                  ? "rounded-br-sm bg-primary text-primary-foreground"
                  : "rounded-bl-sm bg-muted text-foreground"
              }`}
            >
              {msg.text}
            </div>
          </motion.div>
        ))}

        {visibleCount < managementChat.length && visibleCount > 0 && (
          <motion.div className="flex justify-start" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="mr-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 sm:h-6 sm:w-6">
              <img src={buildstartIcon} alt="BuildStart" className="h-2.5 w-2.5 object-contain sm:h-3 sm:w-3" />
            </div>
            <div className="flex gap-1 rounded-xl bg-muted px-4 py-2">
              <motion.span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
              <motion.span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }} />
              <motion.span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }} />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function DashboardSection() {
  return (
    <section id="dashboard" className="section-mint py-14 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.h2
          className="mb-3 text-center font-display text-2xl font-bold text-foreground sm:mb-4 sm:text-3xl md:text-4xl"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Full Control, When You Need It
        </motion.h2>

        <motion.p
          className="mx-auto mb-10 max-w-2xl px-2 text-center text-sm text-muted-foreground sm:text-base md:mb-14 md:text-lg"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          You do not need to open the dashboard every time. Just message your AI agent on{" "}
          <svg className="-mt-0.5 mx-0.5 inline-block h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="#25D366">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>{" "}
          WhatsApp to check stats, add products, manage appointments, and more without ever leaving the chat.
        </motion.p>

        <div className="mx-auto max-w-6xl">
          <div className="grid items-stretch gap-4 sm:gap-6 lg:grid-cols-[1.12fr_auto_0.88fr]">
            <motion.div
              className="overflow-hidden rounded-2xl border border-border bg-card card-shadow"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
            >
              <div className="aspect-[16/9] w-full bg-muted/20 p-2 sm:p-3">
                <img
                  src={dashboardPreview}
                  alt="BuildStart dashboard preview"
                  className="h-full w-full rounded-xl object-contain object-left-top"
                />
              </div>
            </motion.div>

            <div className="flex items-center justify-center">
              <div className="hidden h-full flex-col items-center gap-3 lg:flex">
                <div className="w-px flex-1 bg-border" />
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-sm font-bold text-muted-foreground">
                  OR
                </span>
                <div className="w-px flex-1 bg-border" />
              </div>
              <div className="flex w-full items-center gap-3 py-2 lg:hidden">
                <div className="h-px flex-1 bg-border" />
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-xs font-bold text-muted-foreground sm:h-10 sm:w-10 sm:text-sm">
                  OR
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </div>

            <motion.div
              className="flex h-full min-h-0 items-stretch justify-center"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              transition={{ delay: 0.1 }}
            >
              <div className="h-[320px] w-full sm:h-[380px] lg:h-full lg:w-auto lg:max-w-full lg:aspect-[7/5]">
                <ManagementBotChat />
              </div>
            </motion.div>
          </div>
        </div>

        <motion.p
          className="mt-6 text-center text-xs font-bold text-foreground sm:mt-8 sm:text-sm"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Control your business like a conversation.
        </motion.p>
      </div>
    </section>
  );
}
