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
  Package, Plus, Pencil, Trash2, Save, Tag, Layers, DollarSign, Sparkles
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import VariantEditor, { VariantGroup } from "@/components/VariantEditor";
import MultiMediaUpload from "@/components/MultiMediaUpload";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

interface Product {
  id?: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  image_url: string;
  media_urls: string[];
  is_available: boolean;
  payment_link_enabled: boolean;
  stock_quantity: number | null;
  sort_order: number;
  variants: VariantGroup[];
}

interface AgentMeta {
  capabilities?: string[];
  businessHours?: string;
  faqs?: Array<{ question: string; answer: string }>;
  rules?: string[];
  contactInfo?: string;
}

const EMPTY_PRODUCT = (currency = "USD"): Product => ({
  name: "", description: "", price: 0, currency,
  category: "", image_url: "", media_urls: [], is_available: true, payment_link_enabled: false, stock_quantity: null, sort_order: 0, variants: [],
});

const CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "LKR", name: "Sri Lankan Rupee" },
  { code: "INR", name: "Indian Rupee" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "AED", name: "UAE Dirham" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "ZAR", name: "South African Rand" },
  { code: "KRW", name: "South Korean Won" },
  { code: "THB", name: "Thai Baht" },
  { code: "PHP", name: "Philippine Peso" },
  { code: "MYR", name: "Malaysian Ringgit" },
  { code: "IDR", name: "Indonesian Rupiah" },
  { code: "VND", name: "Vietnamese Dong" },
  { code: "NGN", name: "Nigerian Naira" },
  { code: "KES", name: "Kenyan Shilling" },
  { code: "GHS", name: "Ghanaian Cedi" },
  { code: "EGP", name: "Egyptian Pound" },
  { code: "PKR", name: "Pakistani Rupee" },
];

export default function ProductsTab({ agentId, meta, defaultCurrency = "USD", onCurrencyChanged, autoOpen = false }: { agentId: string; meta?: AgentMeta; defaultCurrency?: string; onCurrencyChanged?: () => void; autoOpen?: boolean }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(autoOpen);
  const [newProduct, setNewProduct] = useState<Product>(EMPTY_PRODUCT(defaultCurrency));
  const [editProduct, setEditProduct] = useState<Product>(EMPTY_PRODUCT(defaultCurrency));
  const [currencyDialogOpen, setCurrencyDialogOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency);
  const [currencySearch, setCurrencySearch] = useState("");
  const [changingCurrency, setChangingCurrency] = useState(false);

  useEffect(() => { loadProducts(); }, [agentId]);
  // Real-time subscription for products changes (e.g. from management assistant)
  useEffect(() => {
    const ch = supabase.channel(`products-rt-${agentId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "products", filter: `agent_id=eq.${agentId}` }, () => loadProducts())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [agentId]);
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

  const loadProducts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("agent_id", agentId)
      .order("sort_order")
      .order("name");
    if (data) {
      setProducts(data.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || "",
        price: Number(p.price),
        currency: p.currency,
        category: p.category || "",
        image_url: p.image_url || "",
        media_urls: (p.media_urls as any as string[]) || [],
        is_available: p.is_available,
        payment_link_enabled: (p as any).payment_link_enabled ?? false,
        stock_quantity: p.stock_quantity,
        sort_order: p.sort_order,
        variants: (p.variants as any as VariantGroup[]) || [],
      })));
    }
    setLoading(false);
  };

  const handleChangeCurrency = async () => {
    setChangingCurrency(true);
    try {
      // Update agent default_currency
      const { error: agentErr } = await supabase.from("agents").update({ default_currency: selectedCurrency }).eq("id", agentId);
      if (agentErr) throw agentErr;
      // Bulk update all products
      const { error: prodErr } = await supabase.from("products").update({ currency: selectedCurrency }).eq("agent_id", agentId);
      if (prodErr) throw prodErr;
      // Bulk update all services
      const { error: svcErr } = await supabase.from("services").update({ currency: selectedCurrency }).eq("agent_id", agentId);
      if (svcErr) throw svcErr;
      setProducts(prev => prev.map(p => ({ ...p, currency: selectedCurrency })));
      setNewProduct(EMPTY_PRODUCT(selectedCurrency));
      toast({ title: "Currency updated!", description: `Changed to ${selectedCurrency} across all products & services.` });
      setCurrencyDialogOpen(false);
      await loadProducts();
      onCurrencyChanged?.();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setChangingCurrency(false);
    }
  };

  const autoPopulateFromMeta = async () => {
    const kb = meta || {};
    const faqs = kb.faqs || [];
    const productHints: Array<{ name: string; description: string }> = [];
    faqs.forEach(f => {
      if (f.question.toLowerCase().includes("price") || f.question.toLowerCase().includes("cost") ||
          f.question.toLowerCase().includes("menu") || f.question.toLowerCase().includes("service")) {
        const lines = f.answer.split(/[,\n•\-]/).filter(l => l.trim().length > 3);
        lines.forEach(l => {
          const priceMatch = l.match(/\$(\d+(?:\.\d{2})?)/);
          productHints.push({
            name: l.replace(/\$\d+(?:\.\d{2})?/, "").replace(/[:\-•]/g, "").trim().slice(0, 60),
            description: priceMatch ? `Price: $${priceMatch[1]}` : "",
          });
        });
      }
    });
    if (productHints.length === 0) {
      toast({ title: "No products found", description: "No product info found in agent config.", variant: "destructive" });
      return;
    }
    const rows = productHints.filter(p => p.name.length > 2).slice(0, 20).map((p, i) => {
      const priceMatch = p.description.match(/\$(\d+(?:\.\d{2})?)/);
      return {
        agent_id: agentId, name: p.name,
        description: p.description.replace(/Price: \$\d+(?:\.\d{2})?/, "").trim() || null,
        price: priceMatch ? parseFloat(priceMatch[1]) : 0, sort_order: i, is_available: true,
      };
    });
    const { error } = await supabase.from("products").insert(rows);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: `${rows.length} products auto-added!` }); await loadProducts(); }
  };

  const addProduct = async () => {
    if (!newProduct.name.trim()) {
      toast({ title: "Product name required", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("products").insert({
      agent_id: agentId,
      name: newProduct.name.trim(),
      description: newProduct.description.trim() || null,
      price: newProduct.price,
      currency: newProduct.currency,
      category: newProduct.category.trim() || null,
      image_url: newProduct.media_urls[0]?.trim() || newProduct.image_url.trim() || null,
      media_urls: newProduct.media_urls as any,
      is_available: newProduct.is_available,
      payment_link_enabled: newProduct.payment_link_enabled,
      stock_quantity: newProduct.stock_quantity,
      sort_order: products.length,
      variants: newProduct.variants as any,
    } as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Product added!" });
      import("@/lib/activityLog").then(m => m.logActivity({ action: "product_added", entityType: "product", metadata: { name: newProduct.name } }));
      setNewProduct(EMPTY_PRODUCT(defaultCurrency));
      setShowAddForm(false);
      await loadProducts();
    }
  };

  const startEdit = (p: Product) => { setEditingId(p.id!); setEditProduct({ ...p }); };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase.from("products").update({
      name: editProduct.name.trim(),
      description: editProduct.description.trim() || null,
      price: editProduct.price,
      currency: editProduct.currency,
      category: editProduct.category.trim() || null,
      image_url: editProduct.media_urls[0]?.trim() || editProduct.image_url.trim() || null,
      media_urls: editProduct.media_urls as any,
      is_available: editProduct.is_available,
      payment_link_enabled: editProduct.payment_link_enabled,
      stock_quantity: editProduct.stock_quantity,
      variants: editProduct.variants as any,
    } as any).eq("id", editingId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Product updated!" }); import("@/lib/activityLog").then(m => m.logActivity({ action: "product_updated", entityType: "product", entityId: editingId })); setEditingId(null); await loadProducts(); }
  };

  const toggleAvailability = async (id: string, current: boolean) => {
    await supabase.from("products").update({ is_available: !current }).eq("id", id);
    await loadProducts();
  };

  const deleteProduct = async (id: string) => {
    await supabase.from("products").delete().eq("id", id);
    toast({ title: "Product deleted" });
    import("@/lib/activityLog").then(m => m.logActivity({ action: "product_deleted", entityType: "product", entityId: id }));
    await loadProducts();
  };

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  if (loading) return <div className="text-center text-muted-foreground py-12">Loading products...</div>;

  const renderProductForm = (product: Product, onChange: (p: Product) => void, onSave: () => void, onCancel: () => void) => (
    <div className="space-y-3">
      <div className="space-y-3">
        <MultiMediaUpload values={product.media_urls} onChange={urls => onChange({ ...product, media_urls: urls, image_url: urls[0] || "" })} agentId={agentId} folder="products" />
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Product Name *</Label>
              <Input value={product.name} onChange={e => onChange({ ...product, name: e.target.value })} placeholder="Product name" className="h-8 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Base Price</Label>
                <Input type="number" step="0.01" value={product.price} onChange={e => onChange({ ...product, price: parseFloat(e.target.value) || 0 })} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Input value={product.category} onChange={e => onChange({ ...product, category: e.target.value })} placeholder="e.g. Main" className="h-8 text-sm" />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea value={product.description} onChange={e => onChange({ ...product, description: e.target.value })} rows={2} placeholder="Optional description" className="text-sm" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Stock (optional)</Label>
          <Input type="number" value={product.stock_quantity ?? ""} onChange={e => onChange({ ...product, stock_quantity: e.target.value ? parseInt(e.target.value) : null })} placeholder="Unlimited" className="h-8 text-sm" />
        </div>
        <div className="flex items-end gap-2 pb-0.5">
          <div className="flex items-center gap-2">
            <Switch checked={product.is_available} onCheckedChange={v => onChange({ ...product, is_available: v })} />
            <Label className="text-xs">{product.is_available ? "Available" : "Unavailable"}</Label>
          </div>
        </div>
        <div className="flex items-end gap-2 pb-0.5">
          <div className="flex items-center gap-2">
            <Switch checked={product.payment_link_enabled} onCheckedChange={async (v) => {
              if (v) {
                const { data: conn } = await supabase.from("stripe_connections").select("id").eq("agent_id", agentId).eq("is_active", true).maybeSingle();
                if (!conn) {
                  toast({ title: "Stripe not connected", description: "Please connect Stripe in Integrations before enabling payment links.", variant: "destructive" });
                  return;
                }
              }
              onChange({ ...product, payment_link_enabled: v });
            }} />
            <Label className="text-xs">{product.payment_link_enabled ? "Payment Link On" : "Payment Link Off"}</Label>
          </div>
        </div>
      </div>

      {/* Variants */}
      <VariantEditor variants={product.variants} onChange={v => onChange({ ...product, variants: v })} basePrice={product.price} currency={product.currency} />

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
          { label: "Total Products", value: products.length, color: "text-foreground" },
          { label: "Available", value: products.filter(p => p.is_available).length, color: "text-accent" },
          { label: "Categories", value: categories.length, color: "text-primary" },
          {
            label: "Avg Price",
            value: products.length
              ? formatMoney(products.reduce((s, p) => s + p.price, 0) / products.length, defaultCurrency)
              : formatMoney(0, defaultCurrency),
            color: "text-foreground",
          },
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
        <h2 className="font-display text-lg font-semibold">Product Catalog</h2>
        <div className="flex flex-wrap gap-2">
          <Dialog
            open={currencyDialogOpen}
            onOpenChange={(open) => {
              setCurrencyDialogOpen(open);
              if (open) {
                setSelectedCurrency(defaultCurrency);
                setCurrencySearch("");
              }
            }}
          >
            <DialogTrigger asChild>
              <Badge variant="secondary" className="text-xs h-8 px-3 flex items-center gap-1 cursor-pointer hover:bg-secondary/80 transition-colors">
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
          <Dialog open={showAddForm} onOpenChange={(open) => { setShowAddForm(open); if (!open) setNewProduct(EMPTY_PRODUCT(defaultCurrency)); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 h-8 text-xs">
                <Plus className="h-3.5 w-3.5" /> Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display">New Product</DialogTitle>
              </DialogHeader>
              {renderProductForm(newProduct, setNewProduct, addProduct, () => setShowAddForm(false))}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {products.length === 0 && !showAddForm ? (
        <Card className="glass border-border/50 card-shadow">
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No products yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-3">Add your first product using the button above or let the assistant do it for you</p>
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
          {products.map((product, i) => (
            <motion.div key={product.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
              {editingId === product.id && (
                <Dialog open={true} onOpenChange={(open) => { if (!open) setEditingId(null); }}>
                  <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="font-display">Edit Product</DialogTitle>
                    </DialogHeader>
                    {renderProductForm(editProduct, setEditProduct, saveEdit, () => setEditingId(null))}
                  </DialogContent>
                </Dialog>
              )}
              {editingId !== product.id && (
                <Card className={cn("glass border-border/50 card-shadow hover:border-primary/30 transition-colors", !product.is_available && "opacity-60")}>
                  <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {(product.media_urls.length > 0 || product.image_url) ? (
                        <div className="relative shrink-0">
                          <img src={product.media_urls[0] || product.image_url} alt={product.name} className="h-12 w-12 rounded-lg object-cover" />
                          {product.media_urls.length > 1 && (
                            <span className="absolute -bottom-1 -right-1 text-[9px] bg-primary text-primary-foreground rounded-full px-1 font-medium">+{product.media_urls.length - 1}</span>
                          )}
                        </div>
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{product.name}</span>
                          <span className="text-primary font-bold text-sm">{formatMoney(product.price, product.currency)}</span>
                          <Badge variant="outline" className="text-[10px]">{product.currency}</Badge>
                          {product.category && <Badge variant="secondary" className="text-[10px]">{product.category}</Badge>}
                          {product.variants.length > 0 && (
                            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                              {product.variants.length} variant{product.variants.length > 1 ? "s" : ""}
                            </Badge>
                          )}
                          {!product.is_available && <Badge variant="outline" className="text-[10px] bg-destructive/20 text-destructive border-destructive/30">Unavailable</Badge>}
                          {product.stock_quantity !== null && product.stock_quantity <= 5 && (
                            <Badge variant="outline" className="text-[10px] bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Low: {product.stock_quantity}</Badge>
                          )}
                        </div>
                        {product.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{product.description}</p>}
                        {product.variants.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {product.variants.map((vg, vi) => (
                              <span key={vi} className="text-[10px] text-muted-foreground">
                                {vg.name}: {vg.options.map(o => o.value).filter(Boolean).join(", ")}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 sm:ml-3 self-end sm:self-center">
                      <Switch checked={product.is_available} onCheckedChange={() => toggleAvailability(product.id!, product.is_available)} />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(product)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteProduct(product.id!)}>
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
