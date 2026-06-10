import { motion } from "framer-motion";
import { Play } from "lucide-react";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

export default function HowItWorksVideoSection() {
  return (
    <section id="how-it-works-video" className="py-20 lg:py-28 bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
          className="text-center"
        >
          <motion.h2
            variants={fadeUp}
            className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4"
          >
            How It Works
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            See how BuildStart turns a simple chat into a fully working agent for your business — in under 5 minutes.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="relative rounded-2xl overflow-hidden border border-border bg-card card-shadow aspect-video"
          >
            {/* Placeholder — replace the src below with your actual video URL */}
            <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
              <div className="flex flex-col items-center gap-3">
                <div className="h-16 w-16 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
                  <Play className="h-7 w-7 text-primary-foreground ml-1" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">Video coming soon</p>
              </div>
            </div>
            {/*
              When you have a video, replace the placeholder above with:
              <iframe
                src="https://www.youtube.com/embed/YOUR_VIDEO_ID"
                title="How BuildStart Works"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            */}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
