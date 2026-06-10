import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Clock, Mic, Globe, FileText, MessageSquare, Brain, Smartphone, Phone, Calendar, Cpu, CalendarCheck, DollarSign, Target, Gift, ChevronDown, CreditCard, ShoppingBag, ShoppingCart, Facebook, Instagram } from "lucide-react";
import buildstartLogo from "@/assets/buildstart-logo.png";
import PromoBanner from "@/components/landing/PromoBanner";

const featureItems = [
  { icon: Clock, label: "Setup Within 5 Minutes", desc: "Go live faster than any other platform", slug: "feature-setup-5-minutes" },
  { icon: Mic, label: "Voice Instructions", desc: "Give instructions verbally to create your AI agent", slug: "feature-voice-instructions" },
  { icon: Globe, label: "Website Scraping", desc: "Scrape data directly through any website", slug: "feature-website-scraping" },
  { icon: FileText, label: "Document Extraction", desc: "Upload PDF, images & extract business data", slug: "feature-document-extraction" },
  { icon: MessageSquare, label: "Auto Follow-ups", desc: "Send follow-up messages automatically", slug: "feature-auto-followups" },
  { icon: Brain, label: "Train Through Chats", desc: "Improve your AI agent by chatting with it", slug: "feature-train-through-chats" },
  { icon: Smartphone, label: "Manage via WhatsApp", desc: "Make changes directly through WhatsApp", slug: "feature-manage-via-whatsapp" },
  { icon: Phone, label: "WhatsApp Call Agent (VOIP)", desc: "Handle customer calls smartly", slug: "feature-whatsapp-voip" },
  { icon: Calendar, label: "Google Calendar", desc: "Sync bookings with Google Calendar", slug: "feature-google-calendar" },
  { icon: Cpu, label: "Smart Logic", desc: "Intelligent decision-making for your AI agent", slug: "feature-ai-driven-logic" },
  { icon: CalendarCheck, label: "Booking Management", desc: "Handle reservations & confirmations", slug: "feature-booking-management" },
  { icon: DollarSign, label: "Sales Automation", desc: "Identifies customers ready to buy", slug: "feature-sales-automation" },
  { icon: Target, label: "Lead Filtering", desc: "Qualify leads automatically", slug: "feature-lead-filtering" },
  { icon: Gift, label: "Automated Welcome Media", desc: "Send images, videos, docs on first contact", slug: "feature-welcome-media" },
];

const integrationItems = [
  { icon: MessageSquare, label: "WhatsApp (Core)", desc: "Direct AI agent-to-WhatsApp integration", slug: "integration-whatsapp" },
  { icon: CreditCard, label: "Stripe Payments", desc: "Process payments within chat", slug: "integration-stripe" },
  { icon: ShoppingBag, label: "Shopify", desc: "Sync products & orders from Shopify", slug: "integration-shopify" },
  { icon: ShoppingCart, label: "WooCommerce", desc: "Connect your WooCommerce store", slug: "integration-woocommerce" },
  { icon: Facebook, label: "Facebook", desc: "Engage customers on Facebook", slug: "integration-facebook" },
  { icon: Instagram, label: "Instagram", desc: "Automate Instagram conversations", slug: "integration-instagram" },
  { icon: Calendar, label: "Google Calendar", desc: "Sync bookings & appointments", slug: "integration-google-calendar" },
];

const navLinks = [
  { label: "Use Cases", href: "#footer-use-cases" },
  { label: "How It Works", href: "#positioning" },
  { label: "Pricing", href: "#pricing" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const [mobileFeatures, setMobileFeatures] = useState(false);
  const [mobileIntegrations, setMobileIntegrations] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const intTimeoutRef = useRef<NodeJS.Timeout>();
  const navigate = useNavigate();

  const scrollTo = (href: string) => {
    setOpen(false);
    setFeaturesOpen(false);
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intTimeoutRef.current) clearTimeout(intTimeoutRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setFeaturesOpen(true);
  };
  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setFeaturesOpen(false), 200);
  };
  const handleIntMouseEnter = () => {
    if (intTimeoutRef.current) clearTimeout(intTimeoutRef.current);
    setIntegrationsOpen(true);
  };
  const handleIntMouseLeave = () => {
    intTimeoutRef.current = setTimeout(() => setIntegrationsOpen(false), 200);
  };

  return (
    <div className="sticky top-0 z-50">
      <PromoBanner />
      <nav className="bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={buildstartLogo} alt="BuildStart" className="h-10" />
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-8">
          {/* Features dropdown */}
          <div
            ref={dropdownRef}
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              onClick={() => scrollTo("#features")}
            >
              Features
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${featuresOpen ? "rotate-180" : ""}`} />
            </button>

            {featuresOpen && (
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[640px] bg-card border border-border rounded-2xl shadow-xl p-4 grid grid-cols-2 gap-1 animate-in fade-in slide-in-from-top-2 duration-200"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                {featureItems.map((f) => (
                  <button
                    key={f.label}
                    onClick={() => { setFeaturesOpen(false); navigate(`/page/${f.slug}`); }}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted transition-colors text-left group"
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/15 transition-colors">
                      <f.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground leading-tight">{f.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Integrations dropdown */}
          <div
            className="relative"
            onMouseEnter={handleIntMouseEnter}
            onMouseLeave={handleIntMouseLeave}
          >
            <button
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              onClick={() => scrollTo("#integrations")}
            >
              Integrations
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${integrationsOpen ? "rotate-180" : ""}`} />
            </button>

            {integrationsOpen && (
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[340px] bg-card border border-border rounded-2xl shadow-xl p-4 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200"
                onMouseEnter={handleIntMouseEnter}
                onMouseLeave={handleIntMouseLeave}
              >
                {integrationItems.map((f) => (
                  <button
                    key={f.label}
                    onClick={() => { setIntegrationsOpen(false); navigate(`/page/${f.slug}`); }}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted transition-colors text-left group w-full"
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                      <f.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground leading-tight">{f.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {navLinks.map((l) => (
            <button
              key={l.href}
              onClick={() => scrollTo(l.href)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <Link to="/auth?mode=login">
            <Button variant="ghost" size="sm" className="text-foreground">Log in</Button>
          </Link>
          <Link to="/setup">
            <Button size="sm" className="rounded-lg">Build Your Agent Now</Button>
          </Link>
        </div>

        {/* Mobile toggle */}
        <button className="lg:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden bg-background border-b border-border px-6 py-4 space-y-3">
          {/* Mobile Features accordion */}
          <button
            onClick={() => setMobileFeatures(!mobileFeatures)}
            className="flex items-center justify-between w-full text-left text-sm font-medium text-muted-foreground"
          >
            Features
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${mobileFeatures ? "rotate-180" : ""}`} />
          </button>
          {mobileFeatures && (
            <div className="pl-3 space-y-2 pb-2">
              {featureItems.map((f) => (
                <Link
                  key={f.label}
                  to={`/page/${f.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground w-full text-left py-1"
                >
                  <f.icon className="h-3.5 w-3.5 text-primary shrink-0" />
                  {f.label}
                </Link>
              ))}
            </div>
          )}

          {/* Mobile Integrations accordion */}
          <button
            onClick={() => setMobileIntegrations(!mobileIntegrations)}
            className="flex items-center justify-between w-full text-left text-sm font-medium text-muted-foreground"
          >
            Integrations
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${mobileIntegrations ? "rotate-180" : ""}`} />
          </button>
          {mobileIntegrations && (
            <div className="pl-3 space-y-2 pb-2">
              {integrationItems.map((f) => (
                <Link
                  key={f.label}
                  to={`/page/${f.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground w-full text-left py-1"
                >
                  <f.icon className="h-3.5 w-3.5 text-primary shrink-0" />
                  {f.label}
                </Link>
              ))}
            </div>
          )}

          {navLinks.map((l) => (
            <button
              key={l.href}
              onClick={() => scrollTo(l.href)}
              className="block w-full text-left text-sm font-medium text-muted-foreground"
            >
              {l.label}
            </button>
          ))}
          <div className="flex gap-3 pt-2">
            <Link to="/auth?mode=login"><Button variant="ghost" size="sm">Log in</Button></Link>
            <Link to="/setup"><Button size="sm">Build Your Agent Now</Button></Link>
          </div>
        </div>
      )}
    </nav>
    </div>
  );
}
