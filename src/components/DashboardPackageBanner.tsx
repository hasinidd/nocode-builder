import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CreditCard, MessageSquare, Zap, Calendar } from "lucide-react";
import { format, addMonths } from "date-fns";

export default function DashboardPackageBanner() {
  const { user } = useAuth();
  const [pkgName, setPkgName] = useState<string | null>(null);
  const [contactsUsed, setContactsUsed] = useState(0);
  const [contactsLimit, setContactsLimit] = useState(0);
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [creditsLimit, setCreditsLimit] = useState(0);
  const [addonActions, setAddonActions] = useState(0);
  const [nextBilling, setNextBilling] = useState<Date | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: up }, { data: addons }] = await Promise.all([
      supabase.from("user_packages").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("addon_purchases" as any).select("addon_type, remaining").eq("user_id", user.id).gt("remaining", 0),
    ]);
    if (!up) return;

    const { data: pkg } = await supabase
      .from("packages")
      .select("name, contacts_limit, ai_credits")
      .eq("id", (up as any).package_id)
      .single();

    if (pkg) {
      setPkgName((pkg as any).name);
      setContactsLimit((pkg as any).contacts_limit);
      setCreditsLimit((pkg as any).ai_credits);
    }
    const addonAi = ((addons as any[]) || [])
      .filter(a => a.addon_type === "ai_actions")
      .reduce((sum, a) => sum + (a.remaining || 0), 0);
    setAddonActions(addonAi);
    setContactsUsed((up as any).contacts_used || 0);
    setCreditsUsed((up as any).ai_credits_used || 0);
    setNextBilling(addMonths(new Date((up as any).billing_cycle_start), 1));
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("pkg-banner")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_packages", filter: `user_id=eq.${user.id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "addon_purchases", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, load]);

  if (!pkgName) return null;

  const totalActions = creditsLimit + addonActions;

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 mb-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{pkgName}</span>
          <Badge variant="outline" className="text-xs">Active</Badge>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5" />
          <span>{contactsUsed}/{contactsLimit} conversations</span>
          <Progress value={contactsLimit > 0 ? (contactsUsed / contactsLimit) * 100 : 0} className="h-1.5 w-16" />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Zap className="h-3.5 w-3.5" />
          <span>
            {creditsUsed}/{totalActions} actions
            {addonActions > 0 && <span className="text-primary ml-1">(+{addonActions} top-up)</span>}
          </span>
          <Progress value={totalActions > 0 ? (creditsUsed / totalActions) * 100 : 0} className="h-1.5 w-16" />
        </div>
        {nextBilling && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>Renews {format(nextBilling, "PP")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
