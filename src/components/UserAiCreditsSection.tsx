import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Zap, TrendingDown } from "lucide-react";

interface CreditRule {
  id: string;
  task_key: string;
  task_label: string;
  credits_cost: number;
}

export default function UserAiCreditsSection() {
  const { user } = useAuth();
  const [rules, setRules] = useState<CreditRule[]>([]);
  const [planCredits, setPlanCredits] = useState(0);
  const [addonCredits, setAddonCredits] = useState(0);
  const [usedCredits, setUsedCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: ruleData }, { data: upData }, { data: addonData }] = await Promise.all([
      supabase.from("ai_credit_rules").select("*").order("task_label"),
      supabase.from("user_packages").select("ai_credits_used, package_id").eq("user_id", user.id).maybeSingle(),
      supabase.from("addon_purchases" as any).select("addon_type, remaining").eq("user_id", user.id).gt("remaining", 0),
    ]);
    setRules((ruleData as any[]) || []);

    if (upData) {
      setUsedCredits((upData as any).ai_credits_used || 0);
      const { data: pkg } = await supabase.from("packages").select("ai_credits").eq("id", (upData as any).package_id).single();
      setPlanCredits((pkg as any)?.ai_credits || 0);
    }
    const addonAi = ((addonData as any[]) || [])
      .filter(a => a.addon_type === "ai_actions")
      .reduce((sum, a) => sum + (a.remaining || 0), 0);
    setAddonCredits(addonAi);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("user-credits-view")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_packages", filter: `user_id=eq.${user.id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "addon_purchases", filter: `user_id=eq.${user.id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_credit_rules" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, load]);

  const totalCredits = planCredits + addonCredits;
  const remaining = Math.max(0, totalCredits - usedCredits);
  const percent = totalCredits > 0 ? Math.min(100, (usedCredits / totalCredits) * 100) : 0;

  if (loading) return <div className="text-muted-foreground py-10 text-center">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">AI Actions</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track your management assistant action usage</p>
      </div>

      {totalCredits > 0 ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-5 text-center">
              <Zap className="h-6 w-6 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">{totalCredits}</div>
              <p className="text-xs text-muted-foreground">
                Total Actions
                {addonCredits > 0 && <span className="text-primary"> (+{addonCredits})</span>}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 text-center">
              <TrendingDown className="h-6 w-6 text-orange-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{usedCredits}</div>
              <p className="text-xs text-muted-foreground">Used Actions</p>
            </CardContent>
          </Card>
          <Card className="border-primary/30">
            <CardContent className="p-5 text-center">
              <Zap className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-primary">{remaining}</div>
              <p className="text-xs text-muted-foreground">Remaining Actions</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No active package. Select a plan in the Billing section to get AI Actions.</p>
          </CardContent>
        </Card>
      )}

      {totalCredits > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Usage</span>
              <span className="font-medium">{usedCredits} / {totalCredits}</span>
            </div>
            <Progress value={percent} className="h-3" />
          </CardContent>
        </Card>
      )}

      {/* Action Cost Reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Action Costs per Task</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>{rule.task_label}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      <Zap className="h-3 w-3" /> {rule.credits_cost}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
