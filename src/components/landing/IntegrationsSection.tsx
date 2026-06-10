import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import whatsappLogo from "@/assets/whatsapp-logo.png";
import shopifyLogo from "@/assets/shopify-logo.png";
import woocommerceLogo from "@/assets/woocommerce-logo.png";
import googleCalendarIcon from "@/assets/google-calendar.svg";
import stripeLogo from "@/assets/stripe-logo.png";
import fbInstagramLogo from "@/assets/fb-instagram.webp";
import buildstartIcon from "@/assets/buildstart-icon.png";
import orbitMobileImg from "@/assets/integrations-orbit-mobile.png";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

const integrations = [
  { logo: whatsappLogo, name: "WhatsApp (Core)", desc: "Connect in under 30 seconds. Runs fully inside WhatsApp." },
  { logo: stripeLogo, name: "Stripe Payments", desc: "Accept payments directly in chat. Convert conversations into completed orders." },
  { logo: shopifyLogo, name: "Shopify", desc: "Sync products, handle orders, manage variants automatically." },
  { logo: woocommerceLogo, name: "WooCommerce", desc: "Full WooCommerce integration for seamless e-commerce." },
  { logo: fbInstagramLogo, name: "Facebook & Instagram", desc: "Keep AI agent updated with latest social data." },
  { logo: googleCalendarIcon, name: "Google Calendar", desc: "Automate bookings. Check availability. Confirm appointments." },
];

const orbitItems = [
  { logo: whatsappLogo, alt: "WhatsApp", size: "h-8 w-8" },
  { logo: stripeLogo, alt: "Stripe", size: "h-6 w-auto" },
  { logo: shopifyLogo, alt: "Shopify", size: "h-6 w-auto" },
  { logo: woocommerceLogo, alt: "WooCommerce", size: "h-8 w-8" },
  { logo: fbInstagramLogo, alt: "Facebook & Instagram", size: "h-7 w-7" },
  { logo: googleCalendarIcon, alt: "Google Calendar", size: "h-8 w-8" },
];

const SIZE = 420;
const CX = SIZE / 2;
const CY = SIZE / 2;
const CENTER_R = 40;
const ICON_R = 28;
const ORBIT_DIST = 155;
const GAP = 10;
const N = orbitItems.length;

function OrbitHub() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.3 });

  const items = orbitItems.map((item, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / N;
    return {
      ...item,
      x: CX + Math.cos(angle) * ORBIT_DIST,
      y: CY + Math.sin(angle) * ORBIT_DIST,
      angle,
    };
  });

  return (
    <div ref={ref}>
      {/* Mobile: static image with fade-in animation */}
      <motion.div
        className="block sm:hidden mx-auto max-w-[340px]"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={isInView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.6, type: "spring", stiffness: 150, damping: 20 }}
      >
        <img src={orbitMobileImg} alt="BuildStart integrations" className="w-full h-auto" />
      </motion.div>

      {/* Desktop: SVG orbit hub */}
      <div className="hidden sm:block relative mx-auto" style={{ width: SIZE, height: SIZE }}>
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        fill="none"
      >
        <defs>
          <marker id="arrow-tip" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0 0 L10 4 L0 8 Z" fill="hsl(var(--primary))" />
          </marker>
        </defs>
        {items.map((item, i) => {
          const dx = item.x - CX;
          const dy = item.y - CY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const ux = dx / dist;
          const uy = dy / dist;
          const x1 = CX + ux * (CENTER_R + GAP);
          const y1 = CY + uy * (CENTER_R + GAP);
          const x2 = item.x - ux * (ICON_R + GAP);
          const y2 = item.y - uy * (ICON_R + GAP);
          return (
            <motion.line
              key={item.alt}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeDasharray="7 5"
              markerEnd="url(#arrow-tip)"
              initial={{ opacity: 0, pathLength: 0 }}
              animate={isInView ? { opacity: 1, pathLength: 1 } : {}}
              transition={{ delay: 0.3 + i * 0.12, duration: 0.5 }}
            />
          );
        })}
      </svg>

      {/* Center logo */}
      <motion.div
        className="absolute flex items-center justify-center rounded-2xl border-2 border-primary bg-card shadow-lg"
        style={{
          width: CENTER_R * 2,
          height: CENTER_R * 2,
          left: CX - CENTER_R,
          top: CY - CENTER_R,
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={isInView ? { scale: 1, opacity: 1 } : {}}
        transition={{ duration: 0.4, type: "spring", stiffness: 200, damping: 18 }}
      >
        <img src={buildstartIcon} alt="BuildStart" className="h-[55%] w-[55%] object-contain" />
      </motion.div>

      {/* Orbit icons */}
      {items.map((item, i) => (
        <motion.div
          key={item.alt}
          className="absolute flex items-center justify-center rounded-xl border border-border bg-card shadow-md"
          style={{
            width: ICON_R * 2,
            height: ICON_R * 2,
            left: item.x - ICON_R,
            top: item.y - ICON_R,
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={isInView ? { scale: 1, opacity: 1 } : {}}
          transition={{ delay: 0.4 + i * 0.1, duration: 0.4, type: "spring", stiffness: 180, damping: 16 }}
        >
          <img src={item.logo} alt={item.alt} className={`${item.size} object-contain`} />
        </motion.div>
      ))}
      </div>
    </div>
  );
}

export default function IntegrationsSection() {
  return (
    <section id="integrations" className="bg-background py-14 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.h2
          className="mb-10 text-center font-display text-2xl font-bold text-foreground sm:text-3xl md:mb-14 md:text-4xl"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Connect Your Entire Business
        </motion.h2>

        <motion.div
          className="mb-12 flex justify-center md:mb-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <OrbitHub />
        </motion.div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:mb-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {integrations.map((intg, i) => (
            <motion.div
              key={intg.name}
              className="rounded-2xl border border-border/50 bg-card/55 p-5 backdrop-blur-xl card-shadow transition-transform duration-300 hover:-translate-y-1 sm:p-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              transition={{ delay: i * 0.05 }}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center">
                <img src={intg.logo} alt={intg.name} className="h-8 w-8 object-contain" />
              </div>
              <h3 className="mb-1 font-display text-sm font-bold text-foreground">{intg.name}</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">{intg.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.p
          className="mb-3 text-center text-base font-bold text-foreground sm:text-lg"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Everything works together automatically.
        </motion.p>
      </div>
    </section>
  );
}
