import { motion } from "framer-motion";
import HeroSlideshow from "./HeroSlideshow";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

export default function PositioningSection() {
  return (
    <section id="positioning" className="section-mint py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-6">
        {/* Interactive Slideshow */}
        <motion.div
          className="mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          <HeroSlideshow />
        </motion.div>

        {/* Full width statements */}
        <motion.div
          className="text-center space-y-6"
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
        >
          <motion.p variants={fadeUp} className="text-xl lg:text-2xl font-bold text-foreground max-w-3xl mx-auto">
            BuildStart Removes the Work.{" "}
            <span className="text-primary">No flows. No rules. No complexity.</span>{" "}
            Automation finally feels like automation.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
