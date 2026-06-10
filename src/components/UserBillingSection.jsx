import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, StripeInvoice } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CreditCard, Check, MessageSquare, Zap, Calendar, Plus, AlertTriangle, Settings, ExternalLink, Receipt, FileText, XCircle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format, addMonths } from "date-fns";
import { useGeoPrice, convertUSD, convertUSDRaw } from "@/hooks/useGeoPrice";
import { claimPendingAgent } from "@/lib/pendingAgent";

interface PkgRow {
  id: string;
  name: string;
  price: number;
  yearly_price: number;
  contacts_limit: number;
  ai_credits: number;
  stripe_price_id: string | null;
  yearly_stripe_price_id: string | null;
}

interface UserPkg {
  id: string;
  package_id: string;
  billing_cycle_start: string;
  contacts_used: number;
  ai_credits_used: number;
}

interface AddonPurchase {
  id: string;
  addon_type: string;
  quantity: number;
  remaining: number;
  purchased_at: string;
}

interface AddonProduct {
  id: string;
  addon_type: string;
  label: string;
  quantity: number;
  price: number;
  stripe_price_id: string | null;
  is_active: boolean;
}

export default function UserBillingSection() {
  const { user, subscription, checkSubscription } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [packages, setPackages] = useState<PkgRow[]>([]);
  const [userPkg, setUserPkg] = useState<UserPkg | null>(null);
  const [addons, setAddons] = useState<AddonPurchase[]>([]);
  const [addonProducts, setAddonProducts] = useState<AddonProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [buyingAddon, setBuyingAddon] = useState<string | null>(null);
  const [managingPortal, setManagingPortal] = useState(false);
  const [cancellingSub, setCancellingSub] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const geo = useGeoPrice();
  const geoSymbol = geo?.symbol ?? "$";
  const geoRate = geo?.rate ?? 1;
  const geoCode = geo?.code ?? "USD";

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const startCheckoutPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    let attempts = 0;
    const wasSubscribed = subscription.subscribed;
    pollingRef.current = setInterval(async () => {
      attempts++;
      await checkSubscription();
      await load();
      // Stop if subscription changed or after 2 minutes
      if (attempts >= 60) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }, 3000);
    // Also stop polling if subscription status changes
    toast({ title: "Checkout opened in new tab", description: "Complete payment there. This page will update automatically." });
  };

  // Handle checkout success redirect
  useEffect(() => {
    const checkoutStatus = searchParams.get("checkout");
    const packageId = searchParams.get("package_id");
    const addonCheckout = searchParams.get("addon_checkout");
    const addonProductId = searchParams.get("addon_product_id");

    if (checkoutStatus === "success") {
      toast({ title: "Payment successful!", description: "Your subscription is now active." });
      checkSubscription();
      const postDest = localStorage.getItem("post_checkout_destination");
      const pendingAgentId = localStorage.getItem("pending_built_agent_id");
      (async () => {
        if (packageId && user) {
          await syncPackageAfterCheckout(packageId);
        }
        // Activate the draft agent built before signup, if any. Keep the
        // pending id until Account successfully resolves the agent.
        if (pendingAgentId && user) {
          try {
            await claimPendingAgent({ agentId: pendingAgentId, activate: true });
          } catch (e) { console.error("activate pending agent failed", e); }
        }
        if (postDest === "whatsapp") {
          localStorage.removeItem("post_checkout_destination");
          setSearchParams({ tab: "whatsapp" }, { replace: true });
        } else {
          setSearchParams({}, { replace: true });
        }
      })();
    } else if (checkoutStatus === "cancelled") {
      toast({ title: "Checkout cancelled", description: "No changes were made." });
      setSearchParams({}, { replace: true });
    } else if (addonCheckout === "success") {
      // Add-on purchased — create addon_purchases record
      if (addonProductId && user) {
        syncAddonAfterCheckout(addonProductId);
      }
      toast({ title: "Top-up purchased!", description: "Your additional capacity has been added." });
      setSearchParams({}, { replace: true });
    } else if (addonCheckout === "cancelled") {
      toast({ title: "Top-up cancelled", description: "No changes were made." });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const syncPackageAfterCheckout = async (packageId: string) => {
    if (!user) return;
    try {
      const { data: existingUp } = await supabase
        .from("user_packages")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingUp) {
        await supabase.from("user_packages").update({
          package_id: packageId,
          contacts_used: 0,
          ai_credits_used: 0,
          billing_cycle_start: new Date().toISOString(),
        }).eq("user_id", user.id);
      } else {
        await supabase.from("user_packages").insert({
          user_id: user.id,
          package_id: packageId,
        });
      }
      load();
    } catch (err) {
      console.error("Failed to sync package after checkout:", err);
    }
  };

  const syncAddonAfterCheckout = async (addonProductId: string) => {
    if (!user) return;
    try {
      // Fetch the addon product to get quantity and type
      const { data: addonProduct } = await supabase
        .from("addon_products")
        .select("addon_type, quantity")
        .eq("id", addonProductId)
        .single();
      if (!addonProduct) return;

      await supabase.from("addon_purchases").insert({
        user_id: user.id,
        addon_type: addonProduct.addon_type,
        quantity: addonProduct.quantity,
        remaining: addonProduct.quantity,
      } as any);
      load();
    } catch (err) {
      console.error("Failed to sync addon after checkout:", err);
    }
  };

  const [allAddonHistory, setAllAddonHistory] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: pkgs }, { data: up }, { data: addonData }, { data: addonProds }, { data: allAddons }] = await Promise.all([
      supabase.from("packages").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("user_packages").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("addon_purchases" as any).select("*").eq("user_id", user.id).gt("remaining", 0).order("purchased_at", { ascending: false }),
      supabase.from("addon_products").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("addon_purchases" as any).select("addon_type, quantity").eq("user_id", user.id),
    ]);
    setAllAddonHistory((allAddons as any[]) || []);
    const pkgList = (pkgs as any[]) || [];
    setPackages(pkgList);
    setAddons((addonData as any[]) || []);
    // Hide free top-ups from user dashboard — only super admins can grant those.
    const visibleAddons = ((addonProds as any[]) || []).filter((ap) => Number(ap.price) > 0);
    setAddonProducts(visibleAddons);

    // Auto-assign free plan if user has no package
    if (!up && pkgList.length > 0) {
      const freePkg = pkgList.find((p: any) => p.price === 0) || pkgList.sort((a: any, b: any) => a.price - b.price)[0];
      if (freePkg) {
        await supabase.from("user_packages").insert({
          user_id: user.id,
          package_id: freePkg.id,
        });
        const { data: newUp } = await supabase.from("user_packages").select("*").eq("user_id", user.id).maybeSingle();
        setUserPkg(newUp as UserPkg | null);
        setLoading(false);
        return;
      }
    }

    setUserPkg(up as UserPkg | null);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("user-billing")
      .on("postgres_changes", { event: "*", schema: "public", table: "packages" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "user_packages", filter: `user_id=eq.${user.id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "addon_purchases", filter: `user_id=eq.${user.id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "addon_products" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, load]);

  const handleSelectPlan = async (pkg: PkgRow) => {
    if (!user) return;

    // Free plan (no stripe_price_id) — direct selection
    if (!pkg.stripe_price_id) {
      setCheckingOut(pkg.id);
      try {
        const { data: existingUp } = await supabase
          .from("user_packages")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingUp) {
          await supabase.from("user_packages").update({
            package_id: pkg.id,
            contacts_used: 0,
            ai_credits_used: 0,
            billing_cycle_start: new Date().toISOString(),
          }).eq("user_id", user.id);
        } else {
          await supabase.from("user_packages").insert({
            user_id: user.id,
            package_id: pkg.id,
          });
        }
        toast({ title: "Free plan activated!" });
        load();
      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      } finally {
        setCheckingOut(null);
      }
      return;
    }

    // Paid plan — Stripe checkout
    setCheckingOut(pkg.id);
    try {
      const isYearly = billingCycle === "yearly";
      const hasYearly = pkg.yearly_price > 0;
      const usdPrice = isYearly && hasYearly ? pkg.yearly_price : pkg.price;
      const localAmount = geoCode !== "USD" ? convertUSDRaw(usdPrice, geoRate) : undefined;

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          priceId: pkg.stripe_price_id,
          packageId: pkg.id,
          mode: "subscription",
          currency: geoCode !== "USD" ? geoCode : undefined,
          amount: localAmount,
          productName: `${pkg.name} Plan${isYearly && hasYearly ? " (Yearly)" : ""}`,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCheckingOut(null);
    }
  };

  const openPortal = async () => {
    setManagingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setManagingPortal(false);
    }
  };

  const cancelSubscription = async () => {
    setCancellingSub(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-subscription", { body: {} });
      if (error) throw error;
      if (data?.success) {
        toast({
          title: "Subscription cancelled",
          description: "Your plan will remain active until the end of the current billing period.",
        });
        await checkSubscription();
        load();
      } else {
        throw new Error(data?.message || "Cancellation failed");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCancellingSub(false);
    }
  };

  const purchaseAddon = async (addonProduct: AddonProduct) => {
    if (!user) return;

    // If addon has a Stripe price, go through Stripe checkout
    if (addonProduct.stripe_price_id) {
      setBuyingAddon(addonProduct.id);
      try {
        const { data, error } = await supabase.functions.invoke("create-addon-checkout", {
          body: { addonProductId: addonProduct.id },
        });
        if (error) throw error;
        if (data?.url) {
          window.location.href = data.url;
        }
      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      } finally {
        setBuyingAddon(null);
      }
      return;
    }

    // Free addon — direct insert
    try {
      await supabase.from("addon_purchases" as any).insert({
        user_id: user.id,
        addon_type: addonProduct.addon_type,
        quantity: addonProduct.quantity,
        remaining: addonProduct.quantity,
      });
      toast({
        title: "Top-up added!",
        description: `${addonProduct.quantity} additional ${addonProduct.addon_type === "conversations" ? "Customer Conversations" : "AI Actions"} added to your account.`,
      });
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const currentPkg = packages.find(p => p.id === userPkg?.package_id);
  const nextBilling = userPkg ? addMonths(new Date(userPkg.billing_cycle_start), 1) : null;
  const contactsPercent = currentPkg && userPkg ? Math.min(100, (userPkg.contacts_used / currentPkg.contacts_limit) * 100) : 0;
  const creditsPercent = currentPkg && userPkg ? Math.min(100, (userPkg.ai_credits_used / currentPkg.ai_credits) * 100) : 0;
  const conversationsNearLimit = currentPkg && userPkg && userPkg.contacts_used >= currentPkg.contacts_limit * 0.9;
  const actionsNearLimit = currentPkg && userPkg && userPkg.ai_credits_used >= currentPkg.ai_credits * 0.9;
  const addonConversations = addons.filter(a => a.addon_type === "conversations").reduce((sum, a) => sum + a.remaining, 0);
  const addonActions = addons.filter(a => a.addon_type === "ai_actions").reduce((sum, a) => sum + a.remaining, 0);

  if (loading) return <div className="text-muted-foreground py-10 text-center">Loading billing...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Billing</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your subscription and usage</p>
        </div>
        {(subscription.subscribed || (currentPkg && currentPkg.price > 0)) && (
          <div className="flex items-center gap-2">
            {subscription.subscribed && (
              <Button variant="outline" size="sm" onClick={openPortal} disabled={managingPortal} className="gap-2">
                <Settings className="h-4 w-4" /> {managingPortal ? "Opening…" : "Manage Subscription"}
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={cancellingSub} className="gap-2 text-destructive hover:text-destructive">
                  {cancellingSub ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  Cancel Subscription
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your plan will remain active until the end of the current billing period. After that, your account will revert to the free tier and paid features will be limited. You can resubscribe at any time.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep subscription</AlertDialogCancel>
                  <AlertDialogAction onClick={cancelSubscription} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Yes, cancel
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* Current Package Summary */}
      {currentPkg && userPkg && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-4 mb-5">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <span className="text-lg font-bold">{currentPkg.name}</span>
                <Badge>Current Plan</Badge>
              </div>
              {currentPkg.price > 0 && (
                <span className="text-lg font-semibold text-primary">{convertUSD(currentPkg.price, geoRate, geoSymbol)}/mo</span>
              )}
              {currentPkg.price === 0 && (
                <Badge variant="secondary">Free</Badge>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground font-medium flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4 text-primary" /> Customer Conversations
                  </span>
                </div>
                <div className="text-2xl font-bold">
                  {userPkg.contacts_used} <span className="text-base font-normal text-muted-foreground">/ {currentPkg.contacts_limit}</span>
                </div>
                <Progress value={contactsPercent} className="h-2.5" />
                {addonConversations > 0 && (
                  <p className="text-xs text-primary">+ {addonConversations} add-on conversations available</p>
                )}
                {conversationsNearLimit && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Approaching limit — consider an upgrade or top-up</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Zap className="h-4 w-4" /> AI Actions
                  </span>
                </div>
                <div className="text-lg font-semibold">
                  {userPkg.ai_credits_used} <span className="text-sm font-normal text-muted-foreground">/ {currentPkg.ai_credits + addonActions}</span>
                </div>
                <Progress value={Math.min(100, (userPkg.ai_credits_used / (currentPkg.ai_credits + addonActions)) * 100)} className="h-2" />
                {addonActions > 0 && (
                  <p className="text-xs text-primary">Includes +{addonActions} from top-ups</p>
                )}
                {actionsNearLimit && addonActions === 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Approaching limit</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Next billing:</span>
                <span className="font-medium">{nextBilling ? format(nextBilling, "PP") : "—"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!currentPkg && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-muted-foreground">
            <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No package selected. Choose a plan below to get started.</p>
          </CardContent>
        </Card>
      )}

      {/* Add-ons / Top-ups */}
      {currentPkg && userPkg && addonProducts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Top-ups</h2>
          <p className="text-sm text-muted-foreground mb-4">Need more? Purchase additional capacity without changing your plan.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {addonProducts.map((ap) => {
              const isFreeAddon = Number(ap.price) <= 0;
              const alreadyClaimedFree = isFreeAddon && allAddonHistory.some(
                (h: any) => h.addon_type === ap.addon_type && Number(h.quantity) === Number(ap.quantity)
              );
              return (
                <Card key={ap.id} className={`border-border/50 ${isFreeAddon ? "border-primary/40 bg-primary/5" : ""}`}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      {ap.addon_type === "conversations" ? (
                        <MessageSquare className="h-5 w-5 text-primary" />
                      ) : (
                        <Zap className="h-5 w-5 text-primary" />
                      )}
                      <span className="font-semibold">{ap.label}</span>
                      {isFreeAddon && <Badge variant="secondary" className="text-[10px]">Free</Badge>}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        +{ap.quantity} {ap.addon_type === "conversations" ? "conversations" : "AI Actions"}
                      </span>
                      <span className="font-bold text-primary">
                        {ap.price > 0 ? convertUSD(ap.price, geoRate, geoSymbol) : "Free"}
                      </span>
                    </div>
                    <Button
                      className="w-full"
                      variant="outline"
                      size="sm"
                      disabled={buyingAddon === ap.id || alreadyClaimedFree}
                      onClick={() => purchaseAddon(ap)}
                    >
                      {alreadyClaimedFree ? (
                        <><Check className="h-3.5 w-3.5 mr-1" /> Already Claimed</>
                      ) : buyingAddon === ap.id ? (
                        "Processing..."
                      ) : ap.price > 0 ? (
                        <><CreditCard className="h-3.5 w-3.5 mr-1" /> Buy Now</>
                      ) : (
                        <><Plus className="h-3.5 w-3.5 mr-1" /> Claim Free</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Packages */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Available Plans</h2>

        {/* Monthly / Yearly toggle */}
        {packages.some(p => p.yearly_price > 0) && (
          <div className="flex justify-start mb-4">
            <div className="inline-flex items-center gap-1 bg-muted rounded-full p-1">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${
                  billingCycle === "monthly"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all flex items-center gap-1.5 ${
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => {
            const isYearly = billingCycle === "yearly";
            const isCurrentPkg = pkg.id === userPkg?.package_id;
            // Determine if user's active subscription is yearly based on Stripe price_id
            const userOnYearly = isCurrentPkg && subscription?.subscribed && !!pkg.yearly_stripe_price_id
              && subscription.priceId === pkg.yearly_stripe_price_id;
            const userOnMonthly = isCurrentPkg && !userOnYearly;
            // Only mark as current when the billing cycle tab matches the actual subscription interval
            const isCurrent = isCurrentPkg && ((isYearly && userOnYearly) || (!isYearly && userOnMonthly));
            const hasYearly = pkg.yearly_price > 0;
            const displayPrice = isYearly && hasYearly ? (pkg.yearly_price / 12) : pkg.price;
            const isFree = displayPrice === 0;
            const priceId = isYearly && hasYearly ? pkg.yearly_stripe_price_id : pkg.stripe_price_id;
            const isPaid = !!priceId;
            const discount = isYearly && hasYearly && pkg.price > 0
              ? Math.round(((pkg.price - pkg.yearly_price / 12) / pkg.price) * 100)
              : null;

            return (
              <Card key={pkg.id} className={`relative overflow-visible ${isCurrent ? "border-primary ring-1 ring-primary/30" : "border-border/50"}`}>
                {discount != null && discount > 0 && (
                  <span className="absolute -top-2.5 right-3 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
                    Save {discount}%
                  </span>
                )}
                {!isFree && hasYearly && !isYearly && (
                  <span className="absolute -top-2.5 left-3 bg-muted text-muted-foreground text-[10px] font-medium px-2 py-0.5 rounded-full z-10">
                    Save with yearly
                  </span>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{pkg.name}</CardTitle>
                    {isCurrent && <Badge variant="default">Your Plan</Badge>}
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    {isFree ? (
                      "Free"
                    ) : (
                      <>
                        {convertUSD(displayPrice, geoRate, geoSymbol)}
                        <span className="text-sm font-normal text-muted-foreground">/mo</span>
                      </>
                    )}
                  </div>
                  {isYearly && hasYearly && !isFree && (
                    <p className="text-xs text-muted-foreground">Billed {convertUSD(pkg.yearly_price, geoRate, geoSymbol)}/year</p>
                  )}
                  {!isYearly && hasYearly && !isFree && (
                    <p className="text-xs text-muted-foreground">Billed monthly</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <span><strong>{pkg.contacts_limit}</strong> conversations/month</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Zap className="h-4 w-4" />
                    <span><strong>{pkg.ai_credits}</strong> AI Actions/month</span>
                  </div>
                  <Button
                    className="w-full mt-2"
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent || checkingOut === pkg.id}
                    onClick={() => handleSelectPlan({ ...pkg, stripe_price_id: priceId } as any)}
                  >
                    {isCurrent ? (
                      <><Check className="h-4 w-4 mr-1" /> {isFree ? "Active" : "Current Plan"}</>
                    ) : checkingOut === pkg.id ? (
                      "Processing..."
                    ) : isPaid ? (
                      <><CreditCard className="h-4 w-4 mr-1" /> Upgrade</>
                    ) : (
                      "Select Plan"
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        {packages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No packages available yet. Contact your administrator.</p>
        )}
      </div>

      {/* Payment History */}
      {subscription.invoices && subscription.invoices.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" /> Payment History
          </h2>
          <Card className="border-border/50">
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {subscription.invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-primary/10 p-2">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{inv.number || "Invoice"}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(inv.created * 1000), "PP")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {(inv.amount / 100).toFixed(2)} {inv.currency.toUpperCase()}
                        </p>
                        <Badge variant={inv.status === "paid" ? "default" : "secondary"} className="text-[10px]">
                          {inv.status === "paid" ? "Paid" : inv.status}
                        </Badge>
                      </div>
                      {inv.hosted_invoice_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(inv.hosted_invoice_url!, "_blank")}
                          className="gap-1"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
