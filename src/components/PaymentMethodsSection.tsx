import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Plus, Trash2, Save, Pencil, Check, X, Wallet, Building2, Smartphone, Truck, DollarSign } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PaymentMethod {
  id?: string;
  method_name: string;
  method_type: string;
  is_enabled: boolean;
  instructions: string;
}

const METHOD_TYPES: Record<string, { label: string; icon: React.ElementType }> = {
  cash: { label: "Cash", icon: DollarSign },
  card: { label: "Card", icon: CreditCard },
  bank_transfer: { label: "Bank Transfer", icon: Building2 },
  upi: { label: "UPI", icon: Smartphone },
  wallet: { label: "Digital Wallet", icon: Wallet },
  cod: { label: "Cash on Delivery", icon: Truck },
  other: { label: "Other", icon: CreditCard },
};

export default function PaymentMethodsSection({ agentId }: { agentId: string }) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newMethod, setNewMethod] = useState<PaymentMethod>({ method_name: "", method_type: "cash", is_enabled: true, instructions: "" });

  useEffect(() => { loadMethods(); }, [agentId]);

  const loadMethods = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("agent_payment_methods")
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at");
    if (data) {
      setMethods(data.map(m => ({
        id: m.id,
        method_name: m.method_name,
        method_type: m.method_type,
        is_enabled: m.is_enabled,
        instructions: m.instructions || "",
      })));
    }
    setLoading(false);
  };

  const addMethod = async () => {
    if (!newMethod.method_name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("agent_payment_methods").insert({
      agent_id: agentId,
      method_name: newMethod.method_name.trim(),
      method_type: newMethod.method_type,
      is_enabled: newMethod.is_enabled,
      instructions: newMethod.instructions.trim() || null,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Payment method added!" });
      setNewMethod({ method_name: "", method_type: "cash", is_enabled: true, instructions: "" });
      setShowAdd(false);
      await loadMethods();
    }
  };

  const toggleMethod = async (id: string, current: boolean) => {
    await supabase.from("agent_payment_methods").update({ is_enabled: !current }).eq("id", id);
    await loadMethods();
  };

  const deleteMethod = async (id: string) => {
    await supabase.from("agent_payment_methods").delete().eq("id", id);
    toast({ title: "Payment method removed" });
    await loadMethods();
  };

  if (loading) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="glass border-border/50 card-shadow h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              <CardTitle className="font-display text-lg">Payment Methods</CardTitle>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)} className="gap-1 h-7 text-xs">
              <Plus className="h-3 w-3" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {showAdd && (
            <div className="p-3 bg-secondary/30 rounded-lg border border-border/30 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input value={newMethod.method_name} onChange={e => setNewMethod({ ...newMethod, method_name: e.target.value })}
                    placeholder="e.g. Visa/Mastercard" className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select value={newMethod.method_type} onValueChange={v => setNewMethod({ ...newMethod, method_type: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(METHOD_TYPES).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Instructions (optional)</Label>
                <Input value={newMethod.instructions} onChange={e => setNewMethod({ ...newMethod, instructions: e.target.value })}
                  placeholder="e.g. Pay to account #1234" className="h-8 text-xs" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setShowAdd(false)} className="h-7 text-xs">Cancel</Button>
                <Button size="sm" onClick={addMethod} className="h-7 text-xs bg-primary hover:bg-primary/90">Add</Button>
              </div>
            </div>
          )}

          {methods.length === 0 && !showAdd ? (
            <p className="text-sm text-muted-foreground text-center py-4">No payment methods configured</p>
          ) : (
            methods.map(m => {
              const config = METHOD_TYPES[m.method_type] || METHOD_TYPES.other;
              return (
                <div key={m.id} className={cn("flex items-center justify-between p-3 rounded-lg border transition-colors",
                  m.is_enabled ? "bg-accent/5 border-accent/20" : "bg-secondary/30 border-border/30 opacity-60"
                )}>
                  <div className="flex items-center gap-3">
                    <config.icon className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{m.method_name}</p>
                      <p className="text-xs text-muted-foreground">{config.label}{m.instructions ? ` · ${m.instructions}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={m.is_enabled} onCheckedChange={() => toggleMethod(m.id!, m.is_enabled)} />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteMethod(m.id!)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
