import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Check, X, Zap } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface CreditRule {
  id: string;
  task_key: string;
  task_label: string;
  credits_cost: number;
}

export default function AiCreditRulesManager() {
  const [rules, setRules] = useState<CreditRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCost, setEditCost] = useState("1");

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("ai_credit_rules")
      .select("*")
      .order("task_label", { ascending: true });
    setRules((data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase.channel("credit-rules-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_credit_rules" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const startEdit = (rule: CreditRule) => {
    setEditingId(rule.id);
    setEditCost(String(rule.credits_cost));
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await supabase.from("ai_credit_rules").update({ credits_cost: parseInt(editCost) || 1 }).eq("id", editingId);
      toast({ title: "Action cost updated" });
      setEditingId(null);
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">AI Actions</h2>
        <p className="text-muted-foreground">Define how many AI Actions each management task consumes. These values apply globally to all users.</p>
      </div>

      {loading ? (
        <div className="text-muted-foreground py-10 text-center">Loading rules...</div>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center text-muted-foreground">
              <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No action rules defined.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Task Key</TableHead>
                <TableHead>Actions Cost</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.task_label}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{rule.task_key}</TableCell>
                  <TableCell>
                    {editingId === rule.id ? (
                      <Input
                        type="number"
                        min="1"
                        value={editCost}
                        onChange={(e) => setEditCost(e.target.value)}
                        className="w-20 h-8"
                      />
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Zap className="h-3.5 w-3.5 text-primary" />
                        {rule.credits_cost}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === rule.id ? (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={saveEdit}>
                          <Check className="h-3.5 w-3.5 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(rule)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
