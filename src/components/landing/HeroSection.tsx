import { motion, AnimatePresence } from "framer-motion";
import TypingPromptBox from "./TypingPromptBox";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Timer, Check, Upload } from "lucide-react";
import whatsappLogo from "@/assets/whatsapp-logo.png";
import shopifyLogo from "@/assets/shopify-logo.png";
import woocommerceLogo from "@/assets/woocommerce-logo.png";
import instagramLogo from "@/assets/instagram-logo.png";
import facebookLogo from "@/assets/facebook-logo.png";
import googleCalendar from "@/assets/google-calendar.svg";
import { useState, useEffect } from "react";
import { useGeoPrice } from "@/hooks/useGeoPrice";

const highlights = [
  {
    id: "integrations",
    text: "Integrates with",
    logos: [
      { src: shopifyLogo, alt: "Shopify" },
      { src: woocommerceLogo, alt: "WooCommerce" },
      { src: instagramLogo, alt: "Instagram" },
      { src: facebookLogo, alt: "Facebook" },
      { src: googleCalendar, alt: "Google Calendar" },
    ],
  },
  {
    id: "upload",
    text: "Upload PDF, Price Cards, Connect Website or Past Chats",
  },
  {
    id: "speed",
    icon: "timer",
    text: "Build and connect in under 5 minutes",
  },
  {
    id: "whatsapp",
    icon: "whatsapp",
    text: "Manage everything directly inside WhatsApp",
    cta: true,
  },
];

export default function HeroSection() {
  const [activeHighlight, setActiveHighlight] = useState(0);
  const geoInfo = useGeoPrice();

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveHighlight((prev) => (prev + 1) % highlights.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="hero"
      className="relative"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 10% 20%, hsl(138 76% 94%) 0%, hsl(0 0% 100%) 70%)",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 md:pt-24 pb-16 sm:pb-20 text-center flex flex-col items-center justify-center">
        {/* Top badge – dynamic country */}
        {geoInfo?.countryName && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
              <span
                className="text-lg"
                style={{
                  fontFamily:
                    "'Noto Color Emoji','Apple Color Emoji','Segoe UI Emoji',sans-serif",
                }}
              >
                {geoInfo.flag}
              </span>
              #1 WhatsApp Automation Tool in {geoInfo.countryName}
            </span>
          </motion.div>
        )}

        {/* Main headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mb-4 space-y-1 text-center font-display text-[2rem] font-extrabold leading-[1.12] text-foreground sm:space-y-2 sm:text-[2.75rem] sm:leading-[1.15] md:text-[3.25rem] lg:text-[3.75rem]"
        >
          <span className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 px-2">
            <span>Build & Manage Your</span>
            <img src={whatsappLogo} alt="WhatsApp" className="inline h-9 w-auto sm:h-10 lg:h-12" />
            <span>AI Agent</span>
          </span>
          <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4">
            <span className="gradient-text inline-block pb-1 whitespace-nowrap">Just by Chatting</span>
            <span className="inline-block pb-1">No Code Required</span>
          </span>
        </motion.h1>

        {/* Typing prompt box */}
        <TypingPromptBox />

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-16 relative inline-block"
        >
          <Link to="/setup">
            <Button size="lg" className="text-base px-8 py-6 rounded-xl gap-2 shadow-lg">
              Build Your Agent Now <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </motion.div>

        {/* Animated highlights carousel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="relative mx-auto max-w-2xl w-full"
        >
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-4">
            {highlights.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveHighlight(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === activeHighlight
                    ? "w-8 bg-primary"
                    : "w-2 bg-border hover:bg-muted-foreground/40"
                }`}
              />
            ))}
          </div>

          {/* Highlight content */}
          <div className="relative h-20 sm:h-20 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {activeHighlight === 0 && (
                <motion.div
                  key="integrations"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                >
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                    Integrates with
                  </span>
                  <div className="flex items-center gap-4">
                    {highlights[0].logos!.map((logo, i) => (
                      <motion.img
                        key={logo.alt}
                        src={logo.src}
                        alt={logo.alt}
                        className="h-8 w-8 sm:h-9 sm:w-9 object-contain"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1, duration: 0.3 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {activeHighlight === 1 && (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0 flex items-center justify-center gap-3"
                >
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                  >
                    <Upload className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                  </motion.div>
                  <span className="text-base sm:text-lg font-semibold text-foreground">
                    Upload PDF, Price Cards, Website or Chats
                  </span>
                </motion.div>
              )}

              {activeHighlight === 2 && (
                <motion.div
                  key="speed"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0 flex items-center justify-center gap-3"
                >
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                  >
                    <Timer className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                  </motion.div>
                  <span className="text-base sm:text-lg font-semibold text-foreground">
                    Build and connect in under 5 minutes
                  </span>
                </motion.div>
              )}

              {activeHighlight === 3 && (
                <motion.div
                  key="whatsapp"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={whatsappLogo}
                      alt="WhatsApp"
                      className="h-8 w-8"
                    />
                    <span className="text-base sm:text-lg font-semibold text-foreground">
                      Manage everything inside WhatsApp
                    </span>
                  </div>
                  <Link to="/setup">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full gap-1.5 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      <Check className="h-4 w-4" /> Build Your Agent Now
                    </Button>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
