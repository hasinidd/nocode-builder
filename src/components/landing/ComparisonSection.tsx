import { motion } from "framer-motion";

const rows = [
  { feature: "Setup", manychat: "Manual", wati: "Manual", respond: "Technical", buildstart: "Just type" },
  { feature: "Logic", manychat: "Rule-based", wati: "Rule-based", respond: "Workflow", buildstart: "Smart" },
  { feature: "Learning", manychat: "No", wati: "Limited", respond: "No", buildstart: "Yes" },
  { feature: "Effort", manychat: "High", wati: "Medium", respond: "High", buildstart: "Near zero" },
  { feature: "Maintenance", manychat: "Constant", wati: "Frequent", respond: "Required", buildstart: "Minimal" },
  { feature: "Time to live", manychat: "Hours to days", wati: "Hours", respond: "Days", buildstart: "Minutes" },
  { feature: "Input types", manychat: "Text only", wati: "Text only", respond: "Text only", buildstart: "Text, Voice, Images, Files" },
  { feature: "VOIP/Calls", manychat: "No", wati: "No", respond: "No", buildstart: "Yes" },
];

export default function ComparisonSection() {
  return (
    <section id="comparison" className="section-mint py-14 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.h2
          className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-center text-foreground mb-10 md:mb-14"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        >
          Others Give Tools. BuildStart Gives Outcomes.
        </motion.h2>

        {/* Mobile: stacked cards */}
        <div className="sm:hidden space-y-3 mb-8">
          {rows.map((row, i) => (
            <motion.div
              key={row.feature}
              className="bg-card rounded-xl border border-border p-4 card-shadow"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.03 }}
            >
              <p className="text-xs font-bold text-foreground mb-2">{row.feature}</p>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div><span className="text-muted-foreground">ManyChat:</span> <span className="text-foreground">{row.manychat}</span></div>
                <div><span className="text-muted-foreground">Wati:</span> <span className="text-foreground">{row.wati}</span></div>
                <div><span className="text-muted-foreground">Respond.io:</span> <span className="text-foreground">{row.respond}</span></div>
                <div className="font-semibold text-primary">BuildStart: {row.buildstart}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Desktop: table */}
        <motion.div
          className="hidden sm:block bg-card rounded-2xl border border-border card-shadow overflow-x-auto"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        >
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 sm:px-5 py-3 sm:py-4 font-semibold text-foreground">Feature</th>
                <th className="px-4 sm:px-5 py-3 sm:py-4 font-semibold text-muted-foreground">ManyChat</th>
                <th className="px-4 sm:px-5 py-3 sm:py-4 font-semibold text-muted-foreground">Wati</th>
                <th className="px-4 sm:px-5 py-3 sm:py-4 font-semibold text-muted-foreground">Respond.io</th>
                <th className="px-4 sm:px-5 py-3 sm:py-4 font-bold text-primary bg-primary/5 rounded-tr-2xl">BuildStart</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.feature} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                  <td className="text-left px-4 sm:px-5 py-2.5 sm:py-3 font-medium text-foreground">{row.feature}</td>
                  <td className="px-4 sm:px-5 py-2.5 sm:py-3 text-center text-muted-foreground">{row.manychat}</td>
                  <td className="px-4 sm:px-5 py-2.5 sm:py-3 text-center text-muted-foreground">{row.wati}</td>
                  <td className="px-4 sm:px-5 py-2.5 sm:py-3 text-center text-muted-foreground">{row.respond}</td>
                  <td className="px-4 sm:px-5 py-2.5 sm:py-3 text-center font-semibold text-primary bg-primary/5">{row.buildstart}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        <motion.p className="text-base sm:text-lg font-bold text-foreground text-center mt-8 sm:mt-10" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          Others give tools. <span className="text-primary">BuildStart gives outcomes.</span>
        </motion.p>
      </div>
    </section>
  );
}
