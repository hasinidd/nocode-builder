import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, CreditCard, Plus, Crown, Users, DollarSign,
  Zap, ExternalLink, Settings, Trash2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  prices: StripePrice[];
}

interface StripePrice {
  id: string;
  unit_amount: number;
  currency: string;
  recurring: { interval: string } | null;
}

export default function AdminPage() {
  const { subscription, checkSubscription } = useAuth();
  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: "",
    interval: "month",
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-stripe-products", {
        body: { action: "list" },
      });
      if (error) throw error;
      setProducts(data?.products || []);
    } catch (err: any) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  };

  const createProduct = async () => {
    if (!newProduct.name || !newProduct.price) {
      toast({ title: "Name and price are required", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-stripe-products", {
        body: {
          action: "create",
          name: newProduct.name,
          description: newProduct.description,
          priceAmount: Math.round(parseFloat(newProduct.price) * 100),
          interval: newProduct.interval,
        },
      });
      if (error) throw error;
      toast({ title: "Plan created!" });
      setShowCreate(false);
      setNewProduct({ name: "", description: "", price: "", interval: "month" });
      await loadProducts();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const toggleProduct = async (productId: string, active: boolean) => {
    try {
      const { error } = await supabase.functions.invoke("manage-stripe-products", {
        body: { action: "toggle", productId, active: !active },
      });
      if (error) throw error;
      toast({ title: active ? "Plan deactivated" : "Plan activated" });
      await loadProducts();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleCheckout = async (priceId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const openPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 glass">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-2">
            {subscription.subscribed && (
              <Badge className="bg-accent/20 text-accent border-accent/30">
                <Crown className="h-3 w-3 mr-1" /> Pro Active
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Subscription Admin</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your Stripe plans and subscriptions</p>
          </div>
          <div className="flex gap-2">
            {subscription.subscribed && (
              <Button variant="outline" onClick={openPortal} className="gap-2">
                <Settings className="h-4 w-4" /> Manage Subscription
              </Button>
            )}
          </div>
        </div>

        {/* Current Subscription Status */}
        <Card className="glass border-border/50 card-shadow">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" /> Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subscription.subscribed ? (
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-accent/20 p-3">
                  <Crown className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="font-medium text-lg">Pro Plan Active</p>
                  <p className="text-sm text-muted-foreground">
                    Renews {subscription.subscriptionEnd
                      ? new Date(subscription.subscriptionEnd).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
                <Button variant="outline" className="ml-auto" onClick={openPortal}>
                  <ExternalLink className="h-4 w-4 mr-2" /> Manage in Stripe
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-muted p-3">
                  <Zap className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-lg">Free Plan</p>
                  <p className="text-sm text-muted-foreground">Upgrade to unlock all features</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plans Management */}
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Plans</h2>
          <Button onClick={() => setShowCreate(!showCreate)} className="gap-2">
            <Plus className="h-4 w-4" /> Create Plan
          </Button>
        </div>

        {showCreate && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass border-primary/30 card-shadow">
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Plan Name</Label>
                    <Input
                      value={newProduct.name}
                      onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. Pro Plan"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Price (USD)</Label>
                    <Input
                      type="number"
                      value={newProduct.price}
                      onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))}
                      placeholder="15.00"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newProduct.description}
                    onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))}
                    placeholder="What's included in this plan..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Billing Interval</Label>
                  <div className="flex gap-2">
                    {["month", "year"].map(iv => (
                      <button
                        key={iv}
                        onClick={() => setNewProduct(p => ({ ...p, interval: iv }))}
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize",
                          newProduct.interval === iv
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {iv}ly
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={createProduct} disabled={creating} className="gap-2">
                    <Plus className="h-4 w-4" /> {creating ? "Creating..." : "Create Plan"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {loading ? (
          <p className="text-center text-muted-foreground py-8">Loading plans...</p>
        ) : products.length === 0 ? (
          <Card className="glass border-border/50">
            <CardContent className="text-center py-12">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No plans created yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product, i) => (
              <motion.div key={product.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className={cn(
                  "glass border-border/50 card-shadow transition-colors",
                  !product.active && "opacity-50"
                )}>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-display font-bold text-lg">{product.name}</h3>
                        {product.description && (
                          <p className="text-xs text-muted-foreground mt-1">{product.description}</p>
                        )}
                      </div>
                      <Badge variant={product.active ? "default" : "secondary"} className="text-[10px]">
                        {product.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    {product.prices.map(price => (
                      <div key={price.id} className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-primary">
                          ${(price.unit_amount / 100).toFixed(2)}
                        </span>
                        {price.recurring && (
                          <span className="text-sm text-muted-foreground">/{price.recurring.interval}</span>
                        )}
                      </div>
                    ))}

                    <div className="flex gap-2 pt-2">
                      {!subscription.subscribed && product.active && product.prices[0] && (
                        <Button size="sm" className="flex-1 gap-1" onClick={() => handleCheckout(product.prices[0].id)}>
                          <CreditCard className="h-3 w-3" /> Upgrade
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleProduct(product.id, product.active)}
                        className="text-xs"
                      >
                        {product.active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>

                    <p className="text-[10px] text-muted-foreground font-mono">{product.id}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
