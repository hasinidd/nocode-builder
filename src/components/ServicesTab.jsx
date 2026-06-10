import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Briefcase, Plus, Pencil, Trash2, Save, Clock, Tag, DollarSign, Sparkles
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import VariantEditor, { VariantGroup } from "@/components/VariantEditor";
import ImageUpload from "@/components/ImageUpload";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

const CURRENCIES = [
  { code: "USD", name: "US Dollar" }, { code: "EUR", name: "Euro" }, { code: "GBP", name: "British Pound" },
  { code: "LKR", name: "Sri Lankan Rupee" }, { code: "INR", name: "Indian Rupee" }, { code: "AUD", name: "Australian Dollar" },
  { code: "CAD", name: "Canadian Dollar" }, { code: "JPY", name: "Japanese Yen" }, { code: "CNY", name: "Chinese Yuan" },
  { code: "SGD", name: "Singapore Dollar" }, { code: "AED", name: "UAE Dirham" }, { code: "BRL", name: "Brazilian Real" },
  { code: "MXN", name: "Mexican Peso" }, { code: "ZAR", name: "South African Rand" }, { code: "KRW", name: "South Korean Won" },
  { code: "THB", name: "Thai Baht" }, { code: "PHP", name: "Philippine Peso" }, { code: "MYR", name: "Malaysian Ringgit" },
  { code: "IDR", name: "Indonesian Rupiah" }, { code: "VND", name: "Vietnamese Dong" }, { code: "NGN", name: "Nigerian Naira" },
  { code: "KES", name: "Kenyan Shilling" }, { code: "GHS", name: "Ghanaian Cedi" }, { code: "EGP", name: "Egyptian Pound" },
  { code: "PKR", name: "Pakistani Rupee" },
];

interface Service {
  id?: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
  currency: string;
  category: string;
  image_url: string;
  is_available: boolean;
  payment_link_enabled: boolean;
  sort_order: number;
  variants: VariantGroup[];
  metadata: Record<string, string>;
}

const EMPTY_SERVICE = (currency = "USD"): Service => ({
  name: "", description: "", duration_minutes: 30, price: 0, currency,
  category: "", image_url: "", is_available: true, payment_link_enabled: false, sort_order: 0, variants: [], metadata: {},
});

export default function ServicesTab({ agentId, agentType, defaultCurrency = "USD", onCurrencyChanged, autoOpen = false }: { agentId: string; agentType?: string; defaultCurrency?: string; onCurrencyChanged?: () => void; autoOpen?: boolean }) {
  const showDuration = agentType === "booking_agent";
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(autoOpen);
  const [newService, setNewService] = useState<Service>(EMPTY_SERVICE(defaultCurrency));
  const [editService, setEditService] = useState<Service>(EMPTY_SERVICE(defaultCurrency));
  const [currencyDialogOpen, setCurrencyDialogOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency);
  const [currencySearch, setCurrencySearch] = useState("");
  const [changingCurrency, setChangingCurrency] = useState(false);

  useEffect(() => { setSelectedCurrency(defaultCurrency); }, [defaultCurrency]);

  const formatMoney = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  };

  const filteredCurrencies = CURRENCIES.filter(({ code, name }) => {
    const term = currencySearch.trim().toLowerCase();
    if (!term) return true;
    return code.toLowerCase().includes(term) || name.toLowerCase().includes(term);
  });

  const handleChangeCurrency = async () => {
    setChangingCurrency(true);
    try {
      const { error: agentErr } = await supabase.from("agents").update({ default_currency: selectedCurrency }).eq("id", agentId);
      if (agentErr) throw agentErr;
      const { error: prodErr } = await supabase.from("products").update({ currency: selectedCurrency }).eq("agent_id", agentId);
      if (prodErr) throw prodErr;
      const { error: svcErr } = await supabase.from("services").update({ currency: selectedCurrency }).eq("agent_id", agentId);
      if (svcErr) throw svcErr;
      setServices(prev => prev.map(s => ({ ...s, currency: selectedCurrency })));
      setNewService(EMPTY_SERVICE(selectedCurrency));
      toast({ title: "Currency updated!", description: `Changed to ${selectedCurrency} across all products & services.` });
      setCurrencyDialogOpen(false);
      await loadServices();
      onCurrencyChanged?.();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setChangingCurrency(false);
    }
  };

  useEffect(() => { loadServices(); }, [agentId]);
  // Real-time subscription for services changes (e.g. from management assistant)
  useEffect(() => {
    const ch = supabase.channel(`services-rt-${agentId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "services", filter: `agent_id=eq.${agentId}` }, () => loadServices())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [agentId]);

  const loadServices = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("agent_id", agentId)
      .order("sort_order")
      .order("name");
    if (data) {
      setServices(data.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description || "",
        duration_minutes: s.duration_minutes,
        price: Number(s.price),
        currency: s.currency,
        category: s.category || "",
        image_url: s.image_url || "",
        is_available: s.is_available,
        payment_link_enabled: (s as any).payment_link_enabled ?? false,
        sort_order: s.sort_order,
        variants: (s.variants as any as VariantGroup[]) || [],
        metadata: (s.metadata as any as Record<string, string>) || {},
      })));
    }
    setLoading(false);
  };

  const addService = async () => {
    if (!newService.name.trim()) {
      toast({ title: "Service name required", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("services").insert({
      agent_id: agentId,
      name: newService.name.trim(),
      description: newService.description.trim() || null,
      duration_minutes: newService.duration_minutes,
      price: newService.price,
      currency: newService.currency,
      category: newService.category.trim() || null,
      image_url: newService.image_url.trim() || null,
      is_available: newService.is_available,
      payment_link_enabled: newService.payment_link_enabled,
      sort_order: services.length,
      variants: newService.variants as any,
      metadata: newService.metadata as any,
    } as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Service added!" });
      import("@/lib/activityLog").then(m => m.logActivity({ action: "service_added", entityType: "service", metadata: { name: newService.name } }));
      setNewService(EMPTY_SERVICE(defaultCurrency));
      setShowAddForm(false);
      await loadServices();
    }
  };

  const startEdit = (s: Service) => { setEditingId(s.id!); setEditService({ ...s }); };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase.from("services").update({
      name: editService.name.trim(),
      description: editService.description.trim() || null,
      duration_minutes: editService.duration_minutes,
      price: editService.price,
      currency: editService.currency,
      category: editService.category.trim() || null,
      image_url: editService.image_url.trim() || null,
      is_available: editService.is_available,
      payment_link_enabled: editService.payment_link_enabled,
      variants: editService.variants as any,
      metadata: editService.metadata as any,
    } as any).eq("id", editingId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Service updated!" }); import("@/lib/activityLog").then(m => m.logActivity({ action: "service_updated", entityType: "service", entityId: editingId })); setEditingId(null); await loadServices(); }
  };

  const toggleAvailability = async (id: string, current: boolean) => {
    await supabase.from("services").update({ is_available: !current }).eq("id", id);
    await loadServices();
  };

  const deleteService = async (id: string) => {
    await supabase.from("services").delete().eq("id", id);
    toast({ title: "Service deleted" });
    import("@/lib/activityLog").then(m => m.logActivity({ action: "service_deleted", entityType: "service", entityId: id }));
    await loadServices();
  };

  const categories = [...new Set(services.map(s => s.category).filter(Boolean))];

  if (loading) return <div className="text-center text-muted-foreground py-12">Loading services...</div>;

  const renderServiceForm = (service: Service, onChange: (s: Service) => void, onSave: () => void, onCancel: () => void) => (
    <div className="space-y-3">
      <div className="flex gap-3">
        <ImageUpload value={service.image_url} onChange={url => onChange({ ...service, image_url: url })} agentId={agentId} folder="services" />
        <div className="flex-1 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Service Name *</Label>
              <Input value={service.name} onChange={e => onChange({ ...service, name: e.target.value })} placeholder="e.g. Haircut, Consultation" className="h-8 text-sm" />
            </div>
            <div className={cn("grid gap-2", showDuration ? "grid-cols-3" : "grid-cols-2")}>
              <div className="space-y-1.5">
                <Label className="text-xs">Base Price</Label>
                <Input type="number" step="0.01" value={service.price} onChange={e => onChange({ ...service, price: parseFloat(e.target.value) || 0 })} className="h-8 text-sm" />
              </div>
              {showDuration && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Duration (min)</Label>
                  <Input type="number" value={service.duration_minutes} onChange={e => onChange({ ...service, duration_minutes: parseInt(e.target.value) || 30 })} className="h-8 text-sm" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Input value={service.category} onChange={e => onChange({ ...service, category: e.target.value })} placeholder="e.g. Hair" className="h-8 text-sm" />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea value={service.description} onChange={e => onChange({ ...service, description: e.target.value })} rows={2} placeholder="Optional description" className="text-sm" />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch checked={service.is_available} onCheckedChange={v => onChange({ ...service, is_available: v })} />
          <Label className="text-xs">{service.is_available ? "Available" : "Unavailable"}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={service.payment_link_enabled} onCheckedChange={async (v) => {
            if (v) {
              const { data: conn } = await supabase.from("stripe_connections").select("id").eq("agent_id", agentId).eq("is_active", true).maybeSingle();
              if (!conn) {
                toast({ title: "Stripe not connected", description: "Please connect Stripe in Integrations before enabling payment links.", variant: "destructive" });
                return;
              }
            }
            onChange({ ...service, payment_link_enabled: v });
          }} />
          <Label className="text-xs">{service.payment_link_enabled ? "Payment Link On" : "Payment Link Off"}</Label>
        </div>
      </div>

      {/* Variants */}
      <VariantEditor variants={service.variants} onChange={v => onChange({ ...service, variants: v })} basePrice={service.price} currency={service.currency} />

      {/* Custom Fields (Metadata) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Custom Fields</Label>
          <Button type="button" variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => {
            const key = `field_${Object.keys(service.metadata).length + 1}`;
            onChange({ ...service, metadata: { ...service.metadata, [key]: "" } });
          }}>
            <Plus className="h-3 w-3" /> Add Field
          </Button>
        </div>
        {Object.entries(service.metadata).map(([key, value]) => (
          <div key={key} className="flex gap-2 items-center">
            <Input
              value={key}
              placeholder="Field name"
              className="h-7 text-xs flex-1"
              onChange={e => {
                const newMeta = { ...service.metadata };
                const val = newMeta[key];
                delete newMeta[key];
                newMeta[e.target.value] = val;
                onChange({ ...service, metadata: newMeta });
              }}
            />
            <Input
              value={value}
              placeholder="Value"
              className="h-7 text-xs flex-1"
              onChange={e => onChange({ ...service, metadata: { ...service.metadata, [key]: e.target.value } })}
            />
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => {
              const newMeta = { ...service.metadata };
              delete newMeta[key];
              onChange({ ...service, metadata: newMeta });
            }}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={onSave} className="bg-primary hover:bg-primary/90 gap-1"><Save className="h-3.5 w-3.5" /> Save</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Services", value: services.length, color: "text-foreground" },
          { label: "Available", value: services.filter(s => s.is_available).length, color: "text-accent" },
          { label: "Categories", value: categories.length, color: "text-primary" },
          { label: "Avg Price", value: services.length ? formatMoney(services.reduce((s, sv) => s + sv.price, 0) / services.length, services[0]?.currency || defaultCurrency) : formatMoney(0, defaultCurrency), color: "text-foreground" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="glass border-border/50">
              <CardContent className="p-4 text-center">
                <p className={cn("text-xl font-display font-bold", s.color)}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">Service Catalog</h2>
        <div className="flex items-center gap-2">
          <Dialog
            open={currencyDialogOpen}
            onOpenChange={(open) => {
              setCurrencyDialogOpen(open);
              if (open) { setSelectedCurrency(defaultCurrency); setCurrencySearch(""); }
            }}
          >
            <DialogTrigger asChild>
              <Badge variant="secondary" className="text-xs gap-1 h-8 px-3 cursor-pointer hover:bg-secondary/80 transition-colors">
                <DollarSign className="h-3 w-3" /> {defaultCurrency}
              </Badge>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Change Currency</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">This will update the currency for your agent, all products, and all services.</p>
              <div className="space-y-2">
                <Label>Select Currency</Label>
                <Input
                  value={currencySearch}
                  onChange={(e) => setCurrencySearch(e.target.value)}
                  placeholder="Search by code or name"
                  className="h-9"
                />
                <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                  <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
                  <SelectContent>
                    {filteredCurrencies.length > 0 ? (
                      filteredCurrencies.map(({ code, name }) => (
                        <SelectItem key={code} value={code}>{code} — {name}</SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-2 text-xs text-muted-foreground">No currencies found</div>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Currently applied: {defaultCurrency}</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCurrencyDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleChangeCurrency} disabled={changingCurrency}>
                  {changingCurrency ? "Updating..." : "Apply Everywhere"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={showAddForm} onOpenChange={(open) => { setShowAddForm(open); if (!open) setNewService(EMPTY_SERVICE(defaultCurrency)); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 h-8 text-xs">
                <Plus className="h-3.5 w-3.5" /> Add Service
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display">New Service</DialogTitle>
              </DialogHeader>
              {renderServiceForm(newService, setNewService, addService, () => setShowAddForm(false))}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {services.length === 0 && !showAddForm ? (
        <Card className="glass border-border/50 card-shadow">
          <CardContent className="text-center py-12">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No services yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-3">Add the services you offer so your agent can inform customers</p>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                document.dispatchEvent(new CustomEvent("open-management-assistant"));
              }}
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Configure via Assistant
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {categories.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mb-3">
              {categories.map(c => <Badge key={c} variant="secondary" className="text-xs"><Tag className="h-3 w-3 mr-1" />{c}</Badge>)}
            </div>
          )}
          {services.map((service, i) => (
            <motion.div key={service.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
              {editingId === service.id && (
                <Dialog open={true} onOpenChange={(open) => { if (!open) setEditingId(null); }}>
                  <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="font-display">Edit Service</DialogTitle>
                    </DialogHeader>
                    {renderServiceForm(editService, setEditService, saveEdit, () => setEditingId(null))}
                  </DialogContent>
                </Dialog>
              )}
              {editingId !== service.id && (
                <Card className={cn("glass border-border/50 card-shadow hover:border-primary/30 transition-colors", !service.is_available && "opacity-60")}>
                  <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {service.image_url ? (
                        <img src={service.image_url} alt={service.name} className="h-12 w-12 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                          <Briefcase className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                     <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{service.name}</span>
                          <span className="text-primary font-bold text-sm">{formatMoney(service.price, service.currency)}</span>
                          {showDuration && (
                            <Badge variant="secondary" className="text-[10px] gap-0.5">
                              <Clock className="h-2.5 w-2.5" /> {service.duration_minutes}min
                            </Badge>
                          )}
                          {service.category && <Badge variant="secondary" className="text-[10px]">{service.category}</Badge>}
                          {service.variants.length > 0 && (
                            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                              {service.variants.length} variant{service.variants.length > 1 ? "s" : ""}
                            </Badge>
                          )}
                          {!service.is_available && <Badge variant="outline" className="text-[10px] bg-destructive/20 text-destructive border-destructive/30">Unavailable</Badge>}
                        </div>
                        {service.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{service.description}</p>}
                        {Object.keys(service.metadata).length > 0 && (
                          <div className="flex gap-2 mt-1 flex-wrap">
                            {Object.entries(service.metadata).map(([key, val]) => (
                              <Badge key={key} variant="outline" className="text-[10px] gap-1 bg-secondary/30">
                                <span className="font-medium">{key}:</span> {val}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {service.variants.length > 0 && (
                          <div className="flex gap-2 mt-1 flex-wrap">
                            {service.variants.map((vg, vi) => (
                              <span key={vi} className="text-[10px] text-muted-foreground">
                                {vg.name}: {vg.options.map(o => o.value).filter(Boolean).join(", ")}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 sm:ml-3 self-end sm:self-center">
                      <Switch checked={service.is_available} onCheckedChange={() => toggleAvailability(service.id!, service.is_available)} />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(service)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteService(service.id!)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
