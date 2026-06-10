import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Check, X, Package, MessageSquare, Zap, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PkgRow {
  id: string;
  name: string;
  price: number;
  yearly_price: number;
  contacts_limit: number;
  ai_credits: number;
  is_active: boolean;
  sort_order: number;
  stripe_price_id: string | null;
  yearly_stripe_price_id: string | null;
}

export default function PackagesManager() {
  const [packages, setPackages] = useState<PkgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", price: "0", yearly_price: "0", contacts_limit: "100", ai_credits: "50" });

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("packages")
      .select("*")
      .order("sort_order", { ascending: true });
    setPackages((data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase.channel("packages-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "packages" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const save = async () => {
    const name = form.name.trim();
    if (!name) return;
    setSaving(true);

    const priceUsd = parseFloat(form.price) || 0;
    const yearlyPriceUsd = parseFloat(form.yearly_price) || 0;
    const contactsLimit = parseInt(form.contacts_limit) || 100;
    const aiCredits = parseInt(form.ai_credits) || 50;

    try {
      let stripePriceId: string | null = null;
      let yearlyStripePriceId: string | null = null;

      const existingPkg = editing ? packages.find(p => p.id === editing) : null;
      const existingStripePriceId = existingPkg?.stripe_price_id || null;
      const existingYearlyStripePriceId = existingPkg?.yearly_stripe_price_id || null;

      // Monthly Stripe price
      if (priceUsd > 0) {
        if (editing && existingStripePriceId && existingPkg && existingPkg.price === priceUsd) {
          stripePriceId = existingStripePriceId;
        } else {
          const { data, error } = await supabase.functions.invoke("manage-stripe-products", {
            body: {
              action: "create",
              name: `${name} (Monthly)`,
              description: `${contactsLimit} conversations/mo, ${aiCredits} AI Actions/mo`,
              priceAmount: Math.round(priceUsd * 100),
              interval: "month",
            },
          });
          if (error) throw error;
          stripePriceId = data?.price?.id || null;
          if (!stripePriceId) throw new Error("Failed to create monthly Stripe price");
        }
      }

      // Yearly Stripe price
      if (yearlyPriceUsd > 0) {
        if (editing && existingYearlyStripePriceId && existingPkg && existingPkg.yearly_price === yearlyPriceUsd) {
          yearlyStripePriceId = existingYearlyStripePriceId;
        } else {
          const { data, error } = await supabase.functions.invoke("manage-stripe-products", {
            body: {
              action: "create",
              name: `${name} (Yearly)`,
              description: `${contactsLimit} conversations/mo, ${aiCredits} AI Actions/mo — billed annually`,
              priceAmount: Math.round(yearlyPriceUsd * 100),
              interval: "year",
            },
          });
          if (error) throw error;
          yearlyStripePriceId = data?.price?.id || null;
          if (!yearlyStripePriceId) throw new Error("Failed to create yearly Stripe price");
        }
      }

      const payload: any = {
        name,
        price: priceUsd,
        yearly_price: yearlyPriceUsd,
        contacts_limit: contactsLimit,
        ai_credits: aiCredits,
        stripe_price_id: stripePriceId,
        yearly_stripe_price_id: yearlyStripePriceId,
      };

      if (editing) {
        await supabase.from("packages").update(payload).eq("id", editing);
        toast({ title: "Package updated" });
      } else {
        await supabase.from("packages").insert({ ...payload, sort_order: packages.length });
        toast({ title: "Package created", description: priceUsd > 0 ? "Stripe products created automatically." : "Free plan created." });
      }

      setEditing(null);
      setAdding(false);
      setForm({ name: "", price: "0", yearly_price: "0", contacts_limit: "100", ai_credits: "50" });
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (pkg: PkgRow) => {
    setEditing(pkg.id);
    setAdding(true);
    setForm({
      name: pkg.name,
      price: String(pkg.price),
      yearly_price: String(pkg.yearly_price || 0),
      contacts_limit: String(pkg.contacts_limit),
      ai_credits: String(pkg.ai_credits),
    });
  };

  const toggleActive = async (pkg: PkgRow) => {
    await supabase.from("packages").update({ is_active: !pkg.is_active }).eq("id", pkg.id);
    load();
  };

  const deletePkg = async (id: string) => {
    if (!confirm("Delete this package? Users on this package will need to select another.")) return;
    await supabase.from("packages").delete().eq("id", id);
    load();
  };

  const calcYearlyMonthly = () => {
    const yearly = parseFloat(form.yearly_price) || 0;
    return yearly > 0 ? (yearly / 12).toFixed(2) : "0.00";
  };

  const calcDiscount = () => {
    const monthly = parseFloat(form.price) || 0;
    const yearly = parseFloat(form.yearly_price) || 0;
    if (monthly <= 0 || yearly <= 0) return null;
    const yearlyMonthly = yearly / 12;
    const discount = Math.round(((monthly - yearlyMonthly) / monthly) * 100);
    return discount > 0 ? discount : null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Set Packages</h2>
          <p className="text-muted-foreground">Define monthly & yearly pricing. Paid plans are auto-linked to Stripe.</p>
        </div>
        {!adding && (
          <Button onClick={() => { setAdding(true); setEditing(null); setForm({ name: "", price: "0", yearly_price: "0", contacts_limit: "100", ai_credits: "50" }); }}>
            <Plus className="h-4 w-4 mr-1" /> Add New Package
          </Button>
        )}
      </div>

      {adding && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{editing ? "Edit Package" : "New Package"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Package Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Starter" />
              </div>
              <div className="space-y-2">
                <Label>Monthly Price (USD)</Label>
                <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                <p className="text-xs text-muted-foreground">Set to 0 for a free plan.</p>
              </div>
              <div className="space-y-2">
                <Label>Yearly Price (USD / year)</Label>
                <Input type="number" min="0" step="0.01" value={form.yearly_price} onChange={(e) => setForm({ ...form, yearly_price: e.target.value })} />
                <p className="text-xs text-muted-foreground">
                  {parseFloat(form.yearly_price) > 0
                    ? `= $${calcYearlyMonthly()}/mo`
                    : "Set to 0 to disable yearly billing."}
                  {calcDiscount() && (
                    <Badge className="ml-2 bg-primary/10 text-primary text-xs">{calcDiscount()}% off vs monthly</Badge>
                  )}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Customer Conversations</Label>
                <Input type="number" min="0" value={form.contacts_limit} onChange={(e) => setForm({ ...form, contacts_limit: e.target.value })} />
                <p className="text-xs text-muted-foreground">Number of customers the bot can talk to per month</p>
              </div>
              <div className="space-y-2">
                <Label>AI Actions</Label>
                <Input type="number" min="0" value={form.ai_credits} onChange={(e) => setForm({ ...form, ai_credits: e.target.value })} />
                <p className="text-xs text-muted-foreground">Management assistant actions per month</p>
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
        <div className="text-muted-foreground py-10 text-center">Loading packages...</div>
      ) : packages.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No packages created yet.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package</TableHead>
                <TableHead>Monthly</TableHead>
                <TableHead>Yearly</TableHead>
                <TableHead><span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> Conversations</span></TableHead>
                <TableHead><span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> AI Actions</span></TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((pkg) => {
                const yearlyMonthly = pkg.yearly_price > 0 ? (pkg.yearly_price / 12) : 0;
                const discount = pkg.price > 0 && yearlyMonthly > 0
                  ? Math.round(((pkg.price - yearlyMonthly) / pkg.price) * 100)
                  : null;

                return (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-medium">{pkg.name}</TableCell>
                    <TableCell>{pkg.price > 0 ? `$${pkg.price}/mo` : "Free"}</TableCell>
                    <TableCell>
                      {pkg.yearly_price > 0 ? (
                        <span className="flex items-center gap-1.5">
                          ${yearlyMonthly.toFixed(2)}/mo
                          {discount && discount > 0 && (
                            <Badge className="bg-primary/10 text-primary text-[10px] px-1.5 py-0">{discount}% off</Badge>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{pkg.contacts_limit}</TableCell>
                    <TableCell>{pkg.ai_credits}</TableCell>
                    <TableCell>
                      <Badge
                        variant={pkg.is_active ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => toggleActive(pkg)}
                      >
                        {pkg.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(pkg)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deletePkg(pkg.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
