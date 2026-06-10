import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Loader2, MessageSquare, Zap, ArrowRight, CreditCard } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useGeoPrice, convertUSD, convertUSDRaw } from "@/hooks/useGeoPrice";
import { claimPendingAgent } from "@/lib/pendingAgent";

interface Pkg {
  id: string;
  name: string;
  price: number;
  yearly_price: number;
  contacts_limit: number;
  ai_credits: number;
  stripe_price_id: string | null;
  yearly_stripe_price_id: string | null;
}

export default function PricingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [selecting, setSelecting] = useState<string | null>(null);
  const geo = useGeoPrice();
  const geoSymbol = geo?.symbol ?? "$";
  const geoRate = geo?.rate ?? 1;
  const geoCode = geo?.code ?? "USD";

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("packages")
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true });
      setPackages((data as Pkg[]) || []);
      setLoading(false);
    })();
  }, []);

  // Claim + activate the built agent (mark draft → active, ensure ownership)
  const activatePendingAgent = async () => {
    if (!user) return;
    await claimPendingAgent({ activate: true });
  };

  const handleSelect = async (pkg: Pkg) => {
    if (!user) return;
    setSelecting(pkg.id);
    try {
      const isYearly = billingCycle === "yearly";
      const hasYearly = pkg.yearly_price > 0;
      const priceId = isYearly && hasYearly ? pkg.yearly_stripe_price_id : pkg.stripe_price_id;
      const usdPrice = isYearly && hasYearly ? pkg.yearly_price : pkg.price;
      const isFree = usdPrice === 0;

      if (isFree || !priceId) {
        // Free plan — assign and continue to WhatsApp connect
        const { data: existing } = await supabase
          .from("user_packages").select("id").eq("user_id", user.id).maybeSingle();
        if (existing) {
          await supabase.from("user_packages").update({
            package_id: pkg.id,
            contacts_used: 0,
            ai_credits_used: 0,
            billing_cycle_start: new Date().toISOString(),
          }).eq("user_id", user.id);
        } else {
          await supabase.from("user_packages").insert({ user_id: user.id, package_id: pkg.id });
        }
        await activatePendingAgent();
        toast({ title: "Free plan activated!", description: "Let's connect your WhatsApp." });
        navigate("/account?tab=whatsapp", { replace: true });
        return;
      }

      // Paid plan → Stripe checkout. Use ?activate=1 so /account flips draft → active on return.
      const localAmount = geoCode !== "USD" ? convertUSDRaw(usdPrice, geoRate) : undefined;
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          priceId,
          packageId: pkg.id,
          mode: "subscription",
          currency: geoCode !== "USD" ? geoCode : undefined,
          amount: localAmount,
          productName: `${pkg.name} Plan${isYearly && hasYearly ? " (Yearly)" : ""}`,
        },
      });
      if (error) throw error;
      if (data?.url) {
        // Mark that we need to activate + redirect to whatsapp tab on return
        localStorage.setItem("post_checkout_destination", "whatsapp");
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSelecting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">Pick a plan to launch your agent</h1>
          <p className="text-muted-foreground">Start free, upgrade anytime. Your agent is built and waiting.</p>
        </div>

        {packages.some(p => p.yearly_price > 0) && (
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-1 bg-muted rounded-full p-1">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${
                  billingCycle === "monthly" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >Monthly</button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all flex items-center gap-1.5 ${
                  billingCycle === "yearly" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                Yearly
                <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">Save</span>
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {packages.map((pkg) => {
            const isYearly = billingCycle === "yearly";
            const hasYearly = pkg.yearly_price > 0;
            const usdPrice = isYearly && hasYearly ? pkg.yearly_price / 12 : pkg.price;
            const isFree = (isYearly && hasYearly ? pkg.yearly_price : pkg.price) === 0;
            const discount = isYearly && hasYearly && pkg.price > 0
              ? Math.round(((pkg.price - pkg.yearly_price / 12) / pkg.price) * 100) : null;

            return (
              <Card key={pkg.id} className="relative overflow-visible border-border/60">
                {discount != null && discount > 0 && (
                  <span className="absolute -top-2.5 right-3 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
                    Save {discount}%
                  </span>
                )}
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{pkg.name}</CardTitle>
                  <div className="text-3xl font-bold text-primary">
                    {isFree ? "Free" : (
                      <>{convertUSD(usdPrice, geoRate, geoSymbol)}<span className="text-sm font-normal text-muted-foreground">/mo</span></>
                    )}
                  </div>
                  {isYearly && hasYearly && !isFree && (
                    <p className="text-xs text-muted-foreground">Billed {convertUSD(pkg.yearly_price, geoRate, geoSymbol)}/year</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <span><strong>{pkg.contacts_limit.toLocaleString()}</strong> conversations/month</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Zap className="h-4 w-4 text-primary" />
                    <span><strong>{pkg.ai_credits.toLocaleString()}</strong> AI Actions/month</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" /> All integrations included
                  </div>
                  <Button
                    className="w-full mt-2 gap-2"
                    disabled={selecting === pkg.id}
                    onClick={() => handleSelect(pkg)}
                  >
                    {selecting === pkg.id ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                    ) : isFree ? (
                      <>Get Started Now <ArrowRight className="h-4 w-4" /></>
                    ) : (
                      <><CreditCard className="h-4 w-4" /> Get Started Now</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
