import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Sparkles, Loader2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useGeoPrice, convertUSD, convertUSDRaw, formatNicePrice } from "@/hooks/useGeoPrice";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const trustItems = ["Live in minutes", "No credit card required", "No technical skills needed"];

interface Package {
  id: string;
  name: string;
  price: number;
  yearly_price: number;
  ai_credits: number;
  contacts_limit: number;
  is_active: boolean;
  sort_order: number;
}

function InfoTip({ text }: { text: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex flex-shrink-0">
          <Info className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground/60 hover:text-primary transition-colors" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="max-w-[240px] text-xs leading-relaxed p-3">
        {text}
      </PopoverContent>
    </Popover>
  );
}

function PricingCard({
  pkg,
  isPopular,
  delay,
  billingCycle,
  geoSymbol,
  geoRate,
  showFirstMonthPromo,
}: {
  pkg: Package;
  isPopular: boolean;
  delay: number;
  billingCycle: "monthly" | "yearly";
  geoSymbol: string;
  geoRate: number;
  showFirstMonthPromo?: boolean;
}) {
  const isYearly = billingCycle === "yearly";
  const hasYearly = pkg.yearly_price > 0;
  const isFree = (isYearly && hasYearly ? pkg.yearly_price : pkg.price) === 0;

  // For yearly: compute yearly total first, then derive monthly so they're consistent
  let displayPrice: string;
  let billedYearlyTotal: string | null = null;

  if (isFree) {
    displayPrice = `${geoSymbol}0`;
  } else if (isYearly && hasYearly) {
    const yearlyConverted = convertUSD(pkg.yearly_price, geoRate, geoSymbol);
    billedYearlyTotal = yearlyConverted;
    // Extract numeric value from yearly, divide by 12, format
    const yearlyRaw = geoRate === 1 ? pkg.yearly_price : convertUSDRaw(pkg.yearly_price, geoRate);
    const monthlyFromYearly = yearlyRaw > 1200 ? Math.round(yearlyRaw / 12 / 50) * 50 : Math.round(yearlyRaw / 12);
    displayPrice = `${geoSymbol}${formatNicePrice(monthlyFromYearly)}`;
  } else {
    displayPrice = convertUSD(pkg.price, geoRate, geoSymbol);
  }

  const discount =
    isYearly && hasYearly && pkg.price > 0
      ? Math.round(((pkg.price - pkg.yearly_price / 12) / pkg.price) * 100)
      : null;

  return (
    <motion.div
      className={`bg-card rounded-2xl p-5 sm:p-6 pt-7 sm:pt-8 text-center card-hover flex flex-col w-full relative overflow-visible ${
        isPopular ? "border-2 border-primary/30" : "border border-border"
      }`}
      style={isPopular ? { boxShadow: "0 8px 40px rgba(16,185,129,0.12)" } : undefined}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeUp}
      transition={{ delay }}
    >
      <div className="absolute -top-3 left-0 right-0 flex justify-center gap-2">
        {isPopular && (
          <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
            Popular
          </span>
        )}
        {discount != null && discount > 0 && (
          <span className="bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full">
            Save {discount}%
          </span>
        )}
      </div>
      <h3 className="text-base sm:text-lg font-bold text-foreground mb-2">{pkg.name}</h3>
      <p className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
        <span className="text-primary">{displayPrice}</span>
        <span className="text-sm sm:text-base font-normal text-muted-foreground"> / month</span>
      </p>
      {billedYearlyTotal && (
        <p className="text-[11px] sm:text-xs text-muted-foreground mb-1">
          Billed {billedYearlyTotal} / year
        </p>
      )}
      {showFirstMonthPromo && !isYearly && (
        <p className="text-[11px] sm:text-xs font-semibold text-red-500 mb-1">
          {geoSymbol}650 for the first month only
        </p>
      )}
      {!isYearly && hasYearly && !isFree && (
        <p className="text-[11px] sm:text-xs text-primary/80 mb-1">
          Save with yearly billing →
        </p>
      )}
      <div className="space-y-2.5 sm:space-y-3 text-left my-4 sm:my-6 flex-1">
        <div className="flex items-start gap-2 sm:gap-2.5 text-xs sm:text-sm text-muted-foreground">
          <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0 mt-0.5" />
          <span className="flex-1">Unlimited AI agent replies</span>
          <InfoTip text="Your AI agent replies to every customer message automatically — unlimited and included. Fair usage policy applies: if we detect abuse or bot-generated traffic, actions may be limited." />
        </div>
        <div className="flex items-start gap-2 sm:gap-2.5 text-xs sm:text-sm text-muted-foreground">
          <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0 mt-0.5" />
          <span className="flex-1">{pkg.contacts_limit.toLocaleString()} customer conversations</span>
          <InfoTip text={`Chat with up to ${pkg.contacts_limit.toLocaleString()} unique phone numbers per month. Each new number counts as one conversation — unlimited messages within each conversation.`} />
        </div>
        <div className="flex items-start gap-2 sm:gap-2.5 text-xs sm:text-sm text-muted-foreground">
          <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0 mt-0.5" />
          <span className="flex-1">{pkg.ai_credits.toLocaleString()} assisted actions</span>
          <InfoTip text="Assisted actions let you control your entire dashboard just by chatting — add products, check stats, manage bookings, and more without opening the dashboard. Manual dashboard access is always free." />
        </div>
        <div className="flex items-start gap-2 sm:gap-2.5 text-xs sm:text-sm text-muted-foreground">
          <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0 mt-0.5" />
          <span className="flex-1">1 WhatsApp number</span>
          <InfoTip text="Connect one WhatsApp number to your AI agent. All packages include one dedicated WhatsApp line for your business." />
        </div>
        <div className="flex items-start gap-2 sm:gap-2.5 text-xs sm:text-sm text-muted-foreground">
          <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0 mt-0.5" />
          <span className="flex-1">All integrations</span>
          <InfoTip text="Connect Shopify, WooCommerce, Stripe, Google Calendar, and more — all included with every plan. No extra fees for integrations." />
        </div>
        {pkg.price > 0 && (
          <div className="flex items-start gap-2 sm:gap-2.5 text-xs sm:text-sm text-muted-foreground">
            <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0 mt-0.5" />
            <span className="flex-1">Setup support included</span>
            <InfoTip text="Our support team will help you set up your AI agent — but it's so easy, you can do it yourself in minutes!" />
          </div>
        )}
      </div>
      <Link to="/setup" className="w-full">
        <Button
          size="lg"
          className={`w-full gap-2 rounded-lg text-sm sm:text-base ${
            isPopular ? "" : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
          }`}
        >
          Build Your Agent Now <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </motion.div>
  );
}

export default function PricingSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const geo = useGeoPrice();

  const geoSymbol = geo?.symbol ?? "$";
  const geoRate = geo?.rate ?? 1;

  const { data: packages, isLoading } = useQuery({
    queryKey: ["landing-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true });
      if (error) throw error;
      return data as Package[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const hasAnyYearly = packages?.some(p => p.yearly_price > 0) ?? false;

  const popularIdx = packages?.length
    ? packages.reduce((maxI, p, i, arr) => (p.price > arr[maxI].price ? i : maxI), 0)
    : -1;

  const isIndianUser = geo?.code === "INR";
  const firstPaidIdx = packages?.findIndex(p => p.price > 0) ?? -1;

  const handleScroll = () => {
    if (!scrollRef.current || !packages) return;
    const el = scrollRef.current;
    const cardWidth = el.scrollWidth / packages.length;
    const idx = Math.round(el.scrollLeft / cardWidth);
    setActiveIdx(Math.min(idx, packages.length - 1));
  };

  return (
    <section id="pricing" className="py-14 lg:py-28" style={{ background: "linear-gradient(180deg, hsl(138 76% 97%) 0%, hsl(0 0% 100%) 100%)" }}>
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <motion.h2
          className="font-display text-2xl md:text-4xl font-bold text-center text-foreground mb-4 md:mb-6"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        >
          Stop Managing Chats. Let BuildStart Run Your WhatsApp.
        </motion.h2>

        {geo && geoSymbol !== "$" && (
          <motion.p
            className="text-center text-xs sm:text-sm text-muted-foreground mb-2"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            {geo.flag} Prices shown in your local currency
          </motion.p>
        )}

        {/* Billing toggle */}
        {hasAnyYearly && (
          <div className="flex justify-center mb-6 sm:mb-8 md:mb-12">
            <div className="inline-flex items-center gap-1 bg-muted rounded-full p-1">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-full transition-all ${
                  billingCycle === "monthly"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-full transition-all flex items-center gap-1.5 ${
                  billingCycle === "yearly"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Yearly
                <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">Save</span>
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : packages && packages.length > 0 ? (
          <>
            {/* Mobile: vertical stack */}
            <div className="flex md:hidden flex-col gap-6 mb-6 px-2">
              {packages.map((pkg, i) => (
                <PricingCard
                  key={pkg.id}
                  pkg={pkg}
                  isPopular={i === popularIdx}
                  delay={i * 0.1}
                  billingCycle={billingCycle}
                  geoSymbol={geoSymbol}
                  geoRate={geoRate}
                  showFirstMonthPromo={isIndianUser && i === firstPaidIdx}
                />
              ))}
            </div>

            {/* Desktop: grid */}
            <div className={`hidden md:grid gap-6 mb-12 max-w-5xl mx-auto ${
              packages.length === 1 ? "max-w-md" :
              packages.length === 2 ? "md:grid-cols-2" :
              packages.length === 3 ? "md:grid-cols-3" :
              "md:grid-cols-4"
            }`}>
              {packages.map((pkg, i) => (
                <PricingCard
                  key={pkg.id}
                  pkg={pkg}
                  isPopular={i === popularIdx}
                  delay={i * 0.1}
                  billingCycle={billingCycle}
                  geoSymbol={geoSymbol}
                  geoRate={geoRate}
                  showFirstMonthPromo={isIndianUser && i === firstPaidIdx}
                />
              ))}
            </div>
          </>
        ) : (
          <motion.div
            className="max-w-md mx-auto bg-card rounded-2xl border-2 border-primary/30 p-6 sm:p-8 text-center card-hover mb-12"
            style={{ boxShadow: "0 8px 40px rgba(16,185,129,0.12)" }}
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          >
            <Sparkles className="h-8 w-8 text-primary mx-auto mb-4" />
            <p className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
              Starting from <span className="text-primary">{geo?.price ?? "$7.50"}</span> / month
            </p>
            <p className="text-sm text-muted-foreground mb-6">Everything you need to run your business on WhatsApp</p>
            <Link to="/setup">
              <Button size="lg" className="w-full gap-2 rounded-lg">
                Build Your Agent Now <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        )}

        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6 mb-8 sm:mb-10">
          {trustItems.map((t) => (
            <span key={t} className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
              <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" /> {t}
            </span>
          ))}
        </div>

        <motion.p
          className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-foreground text-center"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        >
          Live in minutes. <span className="text-primary">Not days.</span>
        </motion.p>
      </div>
    </section>
  );
}
