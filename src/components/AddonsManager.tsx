import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Check, X, ShoppingBag, MessageSquare, Zap, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AddonProduct {
  id: string;
  addon_type: string;
  label: string;
  quantity: number;
  price: number;
  stripe_price_id: string | null;
  is_active: boolean;
  sort_order: number;
}

export default function AddonsManager() {
  const [addons, setAddons] = useState<AddonProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    addon_type: "conversations",
    label: "",
    quantity: "50",
    price: "5",
  });

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("addon_products")
      .select("*")
      .order("sort_order", { ascending: true });
    setAddons((data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const label = form.label.trim();
    if (!label) return;
    setSaving(true);

    const priceUsd = parseFloat(form.price) || 0;
    const quantity = parseInt(form.quantity) || 50;

    try {
      let stripePriceId: string | null = null;
      const existingAddon = editing ? addons.find(a => a.id === editing) : null;

      if (priceUsd > 0) {
        const needsNewStripePrice = !editing || !existingAddon?.stripe_price_id || existingAddon.price !== priceUsd;

        if (needsNewStripePrice) {
          const { data, error } = await supabase.functions.invoke("manage-stripe-products", {
            body: {
              action: "create",
              name: `Top-up: ${label}`,
              description: `${quantity} additional ${form.addon_type === "conversations" ? "Customer Conversations" : "AI Actions"}`,
              priceAmount: Math.round(priceUsd * 100),
            },
          });
          if (error) throw error;
          stripePriceId = data?.price?.id || null;
          if (!stripePriceId) throw new Error("Failed to create Stripe price");
        } else {
          stripePriceId = existingAddon!.stripe_price_id;
        }
      }

      const payload: any = {
        addon_type: form.addon_type,
        label,
        quantity,
        price: priceUsd,
        stripe_price_id: stripePriceId,
      };

      if (editing) {
        await supabase.from("addon_products").update(payload).eq("id", editing);
        toast({ title: "Top-up product updated" });
      } else {
        await supabase.from("addon_products").insert({ ...payload, sort_order: addons.length });
        toast({ title: "Top-up product created", description: priceUsd > 0 ? "Stripe product and price created automatically." : "Free top-up created." });
      }

      setEditing(null);
      setAdding(false);
      setForm({ addon_type: "conversations", label: "", quantity: "50", price: "5" });
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (addon: AddonProduct) => {
    setEditing(addon.id);
    setAdding(true);
    setForm({
      addon_type: addon.addon_type,
      label: addon.label,
      quantity: String(addon.quantity),
      price: String(addon.price),
    });
  };

  const toggleActive = async (addon: AddonProduct) => {
    await supabase.from("addon_products").update({ is_active: !addon.is_active }).eq("id", addon.id);
    load();
  };

  const deleteAddon = async (id: string) => {
    if (!confirm("Delete this top-up product?")) return;
    await supabase.from("addon_products").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Top-up Products</h2>
          <p className="text-muted-foreground">Define purchasable add-on packs. Paid top-ups are auto-linked to Stripe.</p>
        </div>
        {!adding && (
          <Button onClick={() => { setAdding(true); setEditing(null); setForm({ addon_type: "conversations", label: "", quantity: "50", price: "5" }); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Top-up
          </Button>
        )}
      </div>

      {adding && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{editing ? "Edit Top-up" : "New Top-up"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.addon_type} onValueChange={(v) => setForm({ ...form, addon_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conversations">Customer Conversations</SelectItem>
                    <SelectItem value="ai_actions">AI Actions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Label</Label>
                <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. 50 Extra Conversations" />
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                <p className="text-xs text-muted-foreground">How many conversations or actions the user gets</p>
              </div>
              <div className="space-y-2">
                <Label>Price (USD)</Label>
                <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                <p className="text-xs text-muted-foreground">One-time payment via Stripe</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={save} disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...</> : <><Check className="h-4 w-4 mr-1" /> {editing ? "Update" : "Save"}</>}
              </Button>
              <Button variant="outline" onClick={() => { setAdding(false); setEditing(null); }}><X className="h-4 w-4 mr-1" /> Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-muted-foreground py-10 text-center">Loading top-ups...</div>
      ) : addons.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center text-muted-foreground">
              <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No top-up products created yet.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stripe</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {addons.map((addon) => (
                <TableRow key={addon.id}>
                  <TableCell className="font-medium">{addon.label}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      {addon.addon_type === "conversations" ? <MessageSquare className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                      {addon.addon_type === "conversations" ? "Conversations" : "AI Actions"}
                    </Badge>
                  </TableCell>
                  <TableCell>{addon.quantity}</TableCell>
                  <TableCell>{addon.price > 0 ? `$${addon.price}` : "Free"}</TableCell>
                  <TableCell>
                    {addon.stripe_price_id ? (
                      <Badge variant="outline" className="text-xs font-mono">{addon.stripe_price_id.slice(0, 18)}…</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={addon.is_active ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => toggleActive(addon)}
                    >
                      {addon.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(addon)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteAddon(addon.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
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
