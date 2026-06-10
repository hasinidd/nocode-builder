import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ShoppingCart, User, Phone, Mail, MapPin, Clock, Package,
  Check, X, Truck, Download, Search, ChevronDown, ChevronUp,
  CreditCard, FileText, DollarSign, Plus, Minus, Trash2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import NotificationConfig from "@/components/NotificationConfig";

interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  currency: string;
  is_available: boolean;
  stock_quantity: number | null;
  image_url: string | null;
  category: string | null;
}

interface CartItem {
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  status: string;
  payment_method: string | null;
  payment_status: string;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  created_at: string;
  items?: OrderItem[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Pending", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Check },
  preparing: { label: "Preparing", color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: Package },
  shipped: { label: "Shipped", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: Truck },
  delivered: { label: "Delivered", color: "bg-accent/20 text-accent border-accent/30", icon: Check },
  cancelled: { label: "Cancelled", color: "bg-destructive/20 text-destructive border-destructive/30", icon: X },
  refunded: { label: "Refunded", color: "bg-muted text-muted-foreground border-border", icon: DollarSign },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  unpaid: { label: "Unpaid", color: "bg-destructive/20 text-destructive border-destructive/30" },
  paid: { label: "Paid", color: "bg-accent/20 text-accent border-accent/30" },
  refunded: { label: "Refunded", color: "bg-muted text-muted-foreground border-border" },
};

const STATUS_FLOW = ["pending", "confirmed", "preparing", "shipped", "delivered"];

export default function OrdersTab({ agentId, defaultCurrency = "USD", autoOpen = false }: { agentId: string; defaultCurrency?: string; autoOpen?: boolean }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // Manual order form
  const [showAddOrder, setShowAddOrder] = useState(autoOpen);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderName, setOrderName] = useState("");
  const [orderEmail, setOrderEmail] = useState("");
  const [orderPhone, setOrderPhone] = useState("");
  const [orderAddress, setOrderAddress] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [submittingOrder, setSubmittingOrder] = useState(false);

  useEffect(() => { loadOrders(); loadCatalogProducts(); }, [agentId]);

  const loadOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false });
    if (data) setOrders(data as Order[]);
    setLoading(false);
  };

  const loadCatalogProducts = async () => {
    const { data } = await supabase
      .from("products").select("id, name, price, currency, is_available, stock_quantity, image_url, category")
      .eq("agent_id", agentId).eq("is_available", true)
      .order("sort_order");
    if (data) setCatalogProducts(data);
  };

  const addToCart = (product: CatalogProduct) => {
    setCart(prev => {
      const existing = prev.find(c => c.product_id === product.id);
      if (existing) {
        return prev.map(c => c.product_id === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { product_id: product.id, product_name: product.name, unit_price: product.price, quantity: 1 }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart(prev => prev
      .map(c => c.product_id === productId ? { ...c, quantity: c.quantity + delta } : c)
      .filter(c => c.quantity > 0)
    );
  };

  const cartTotal = cart.reduce((s, c) => s + c.unit_price * c.quantity, 0);

  const submitManualOrder = async () => {
    if (!orderName.trim()) { toast({ title: "Customer name required", variant: "destructive" }); return; }
    if (cart.length === 0) { toast({ title: "Add at least one product", variant: "destructive" }); return; }
    setSubmittingOrder(true);
    const orderNumber = `M-${Date.now().toString(36).toUpperCase()}`;
    const { data: orderData, error: orderError } = await supabase.from("orders").insert({
      agent_id: agentId,
      order_number: orderNumber,
      customer_name: orderName.trim(),
      customer_email: orderEmail.trim() || null,
      customer_phone: orderPhone.trim() || null,
      delivery_address: orderAddress.trim() || null,
      notes: orderNotes.trim() || null,
      subtotal: cartTotal,
      tax: 0,
      total: cartTotal,
      status: "confirmed",
      payment_status: "unpaid",
    }).select("id").single();

    if (orderError || !orderData) {
      toast({ title: "Error creating order", description: orderError?.message, variant: "destructive" });
      setSubmittingOrder(false);
      return;
    }

    // Insert order items
    const items = cart.map(c => ({
      order_id: orderData.id,
      product_id: c.product_id,
      product_name: c.product_name,
      unit_price: c.unit_price,
      quantity: c.quantity,
      total_price: c.unit_price * c.quantity,
    }));
    await supabase.from("order_items").insert(items);

    // Update stock quantities
    for (const c of cart) {
      const product = catalogProducts.find(p => p.id === c.product_id);
      if (product && product.stock_quantity !== null) {
        const newStock = Math.max(0, product.stock_quantity - c.quantity);
        await supabase.from("products").update({ stock_quantity: newStock }).eq("id", c.product_id);
      }
    }

    toast({ title: "Order created!", description: `Order #${orderNumber}` });
    import("@/lib/activityLog").then(m => m.logActivity({ action: "order_created", entityType: "order", entityId: orderData.id, metadata: { order_number: orderNumber, items: cart.length, total: cartTotal } }));
    resetOrderForm();
    setShowAddOrder(false);
    setSubmittingOrder(false);
    await loadOrders();
    await loadCatalogProducts();
  };

  const resetOrderForm = () => {
    setCart([]); setOrderName(""); setOrderEmail(""); setOrderPhone("");
    setOrderAddress(""); setOrderNotes(""); setProductSearch("");
  };

  const loadOrderItems = async (orderId: string) => {
    const { data } = await supabase.from("order_items").select("*").eq("order_id", orderId);
    if (data) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, items: data as OrderItem[] } : o));
    }
  };

  const toggleExpand = (orderId: string) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
    } else {
      setExpandedOrder(orderId);
      const order = orders.find(o => o.id === orderId);
      if (!order?.items) loadOrderItems(orderId);
    }
  };

  const updateStatus = async (orderId: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: `Order ${status}` }); import("@/lib/activityLog").then(m => m.logActivity({ action: "order_status_changed", entityType: "order", entityId: orderId, metadata: { status } })); await loadOrders(); }
  };

  const updatePaymentStatus = async (orderId: string, paymentStatus: string) => {
    const { error } = await supabase.from("orders").update({ payment_status: paymentStatus }).eq("id", orderId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: `Payment marked as ${paymentStatus}` }); import("@/lib/activityLog").then(m => m.logActivity({ action: "order_status_changed", entityType: "order", entityId: orderId, metadata: { payment_status: paymentStatus } })); await loadOrders(); }
  };

  const exportDeliveryCSV = () => {
    const deliveryOrders = orders.filter(o => ["confirmed", "preparing", "shipped"].includes(o.status));
    if (deliveryOrders.length === 0) {
      toast({ title: "No orders to export", description: "No orders pending delivery", variant: "destructive" });
      return;
    }
    const headers = ["Order #", "Customer", "Phone", "Email", "Address", "Status", "Total", "Payment", "Date"];
    const rows = deliveryOrders.map(o => [
      o.order_number, o.customer_name, o.customer_phone || "", o.customer_email || "",
      `"${(o.delivery_address || "").replace(/"/g, '""')}"`,
      o.status, o.total.toFixed(2), o.payment_status,
      format(new Date(o.created_at), "yyyy-MM-dd HH:mm"),
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `delivery-orders-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported!", description: `${deliveryOrders.length} orders exported` });
  };

  const filtered = orders.filter(o => {
    if (filter !== "all" && o.status !== filter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        (o.customer_email || "").toLowerCase().includes(q) ||
        (o.customer_phone || "").includes(q);
    }
    return true;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    active: orders.filter(o => ["confirmed", "preparing", "shipped"].includes(o.status)).length,
    delivered: orders.filter(o => o.status === "delivered").length,
    revenue: orders.filter(o => o.payment_status === "paid").reduce((s, o) => s + Number(o.total), 0),
  };

  if (loading) return <div className="text-center text-muted-foreground py-12">Loading orders...</div>;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Pending", value: stats.pending, color: "text-yellow-400" },
          { label: "Active", value: stats.active, color: "text-blue-400" },
          { label: "Delivered", value: stats.delivered, color: "text-accent" },
          { label: "Revenue", value: `${defaultCurrency} ${stats.revenue.toFixed(0)}`, color: "text-primary" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="glass border-border/50">
              <CardContent className="p-2.5 sm:p-4 text-center">
                <p className={cn("text-base sm:text-xl font-display font-bold truncate", s.color)}>{s.value}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Controls */}
      <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3">
        <div className="flex gap-0.5 sm:gap-1 bg-secondary/50 rounded-lg p-0.5 sm:p-1 overflow-x-auto no-scrollbar">
          {["all", "pending", "confirmed", "preparing", "shipped", "delivered", "cancelled"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-2 sm:px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-medium transition-colors capitalize whitespace-nowrap",
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}>{f}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search..." className="pl-8 h-8 text-xs w-full sm:w-48" />
          </div>
          <NotificationConfig agentId={agentId} entityType="order" />
          <Button size="sm" variant="outline" onClick={exportDeliveryCSV} className="gap-1 h-8 text-xs shrink-0">
            <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Export</span><span className="sm:hidden">CSV</span>
          </Button>
          <Button size="sm" onClick={() => { resetOrderForm(); setShowAddOrder(true); }} className="gap-1 bg-primary hover:bg-primary/90 h-8 text-xs shrink-0">
            <Plus className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Add Order</span><span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Add Order Dialog */}
      <Dialog open={showAddOrder} onOpenChange={(open) => { setShowAddOrder(open); if (!open) resetOrderForm(); }}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">New Manual Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Customer Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Customer Name *</Label>
                <Input value={orderName} onChange={e => setOrderName(e.target.value)} placeholder="John Doe" className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input value={orderPhone} onChange={e => setOrderPhone(e.target.value)} placeholder="+1 234 567" className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input value={orderEmail} onChange={e => setOrderEmail(e.target.value)} placeholder="john@email.com" className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Delivery Address</Label>
                <Input value={orderAddress} onChange={e => setOrderAddress(e.target.value)} placeholder="Optional" className="h-8 text-xs" />
              </div>
            </div>

            {/* Product Picker */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Add Products *</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                  placeholder="Search products..." className="pl-8 h-8 text-xs" />
              </div>
              {catalogProducts.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3 text-center">No products in catalog. Add products first.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                  {catalogProducts
                    .filter(p => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()) || (p.category || "").toLowerCase().includes(productSearch.toLowerCase()))
                    .map(product => {
                      const inCart = cart.find(c => c.product_id === product.id);
                      return (
                        <div key={product.id}
                          className={cn(
                            "flex items-center justify-between rounded-md border px-2.5 py-2 text-xs transition-all cursor-pointer",
                            inCart ? "border-primary/50 bg-primary/5" : "border-border/50 bg-secondary/30 hover:border-primary/30"
                          )}
                          onClick={() => !inCart && addToCart(product)}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{product.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {defaultCurrency} {product.price}
                              {product.stock_quantity !== null && <span> · Stock: {product.stock_quantity}</span>}
                            </p>
                          </div>
                          {inCart ? (
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              <Button size="icon" variant="ghost" className="h-5 w-5" onClick={e => { e.stopPropagation(); updateCartQty(product.id, -1); }}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-5 text-center font-medium">{inCart.quantity}</span>
                              <Button size="icon" variant="ghost" className="h-5 w-5" onClick={e => { e.stopPropagation(); updateCartQty(product.id, 1); }}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-2" />
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Cart Summary */}
            {cart.length > 0 && (
              <div className="bg-secondary/30 rounded-lg p-3 border border-border/50 space-y-2">
                <p className="text-xs font-medium">Order Items</p>
                {cart.map(item => (
                  <div key={item.product_id} className="flex items-center justify-between text-xs">
                    <span className="truncate mr-2">{item.product_name} × {item.quantity}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-medium">{defaultCurrency} {(item.unit_price * item.quantity).toFixed(2)}</span>
                      <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setCart(prev => prev.filter(c => c.product_id !== item.product_id))}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="border-t border-border/50 pt-2 flex justify-between text-sm font-bold">
                  <span>Total</span>
                  <span>{defaultCurrency} {cartTotal.toFixed(2)}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Stock will be automatically deducted for products with inventory tracking</p>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Input value={orderNotes} onChange={e => setOrderNotes(e.target.value)} placeholder="Optional notes" className="h-8 text-xs" />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowAddOrder(false)}>Cancel</Button>
              <Button size="sm" className="h-8 text-xs bg-primary hover:bg-primary/90" onClick={submitManualOrder}
                disabled={submittingOrder || !orderName.trim() || cart.length === 0}>
                {submittingOrder ? "Creating..." : "Create Order"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Orders List */}
      {filtered.length === 0 ? (
        <Card className="glass border-border/50 card-shadow">
          <CardContent className="text-center py-12">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No {filter !== "all" ? filter : ""} orders</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((order, i) => {
            const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const ps = PAYMENT_STATUS_CONFIG[order.payment_status] || PAYMENT_STATUS_CONFIG.unpaid;
            const isExpanded = expandedOrder === order.id;
            const currentIdx = STATUS_FLOW.indexOf(order.status);
            const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;

            return (
              <motion.div key={order.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                <Card className="glass border-border/50 card-shadow hover:border-primary/30 transition-colors">
                  <CardContent className="p-0">
                    {/* Main row */}
                    <div className="p-3 sm:p-4 cursor-pointer" onClick={() => toggleExpand(order.id)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                          <div className="rounded-full bg-primary/10 p-1.5 sm:p-2 shrink-0 mt-0.5">
                            <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <span className="font-mono text-xs sm:text-sm font-bold text-primary">#{order.order_number}</span>
                              <span className="text-xs sm:text-sm font-medium truncate">{order.customer_name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <Badge variant="outline" className={cn("text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0", sc.color)}>{sc.label}</Badge>
                              <Badge variant="outline" className={cn("text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0", ps.color)}>{ps.label}</Badge>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 mt-1 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                              <span className="font-medium">{defaultCurrency} {Number(order.total).toFixed(2)}</span>
                              <span>{format(new Date(order.created_at), "MMM d, h:mm a")}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {nextStatus && order.status !== "cancelled" && (
                            <Button size="sm" variant="outline" className="h-6 sm:h-7 text-[9px] sm:text-xs gap-1 px-1.5 sm:px-2.5"
                              onClick={e => { e.stopPropagation(); updateStatus(order.id, nextStatus); }}>
                              <sc.icon className="h-3 w-3" />
                              <span className="hidden sm:inline">→ {STATUS_CONFIG[nextStatus]?.label}</span>
                              <span className="sm:hidden">Next</span>
                            </Button>
                          )}
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        className="border-t border-border/30 px-3 sm:px-4 py-3 sm:py-4 space-y-3 sm:space-y-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Customer</p>
                            <p className="font-medium text-xs sm:text-sm flex items-center gap-1"><User className="h-3 w-3" /> {order.customer_name}</p>
                            {order.customer_email && <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 mt-1"><Mail className="h-3 w-3" /> {order.customer_email}</p>}
                            {order.customer_phone && <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3" /> {order.customer_phone}</p>}
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Delivery</p>
                            {order.delivery_address ? (
                              <p className="text-[10px] sm:text-xs flex items-start gap-1"><MapPin className="h-3 w-3 mt-0.5 shrink-0" /> {order.delivery_address}</p>
                            ) : <p className="text-[10px] sm:text-xs text-muted-foreground">No address</p>}
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Payment</p>
                            <p className="text-[10px] sm:text-xs">Subtotal: {defaultCurrency} {Number(order.subtotal).toFixed(2)}</p>
                            <p className="text-[10px] sm:text-xs">Tax: {defaultCurrency} {Number(order.tax).toFixed(2)}</p>
                            <p className="text-xs sm:text-sm font-bold">Total: {defaultCurrency} {Number(order.total).toFixed(2)}</p>
                          </div>
                        </div>

                        {order.items && order.items.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">Items</p>
                            <div className="space-y-1">
                              {order.items.map(item => (
                                <div key={item.id} className="flex items-center justify-between bg-secondary/30 rounded-md px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs">
                                  <span className="truncate mr-2">{item.product_name} × {item.quantity}</span>
                                  <span className="font-medium shrink-0">{defaultCurrency} {Number(item.total_price).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {order.notes && (
                          <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3 shrink-0" /> {order.notes}</p>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 flex-wrap pt-2 border-t border-border/30">
                          {order.payment_status === "unpaid" && (
                            <Button size="sm" variant="outline" className="h-7 text-[10px] sm:text-xs gap-1"
                              onClick={() => updatePaymentStatus(order.id, "paid")}>
                              <DollarSign className="h-3 w-3" /> Mark Paid
                            </Button>
                          )}
                          {order.status !== "cancelled" && order.status !== "delivered" && (
                            <Button size="sm" variant="outline" className="h-7 text-[10px] sm:text-xs gap-1 text-destructive border-destructive/30"
                              onClick={() => updateStatus(order.id, "cancelled")}>
                              <X className="h-3 w-3" /> Cancel
                            </Button>
                          )}
                          {order.payment_status === "paid" && order.status === "cancelled" && (
                            <Button size="sm" variant="outline" className="h-7 text-[10px] sm:text-xs gap-1"
                              onClick={() => updatePaymentStatus(order.id, "refunded")}>
                              <DollarSign className="h-3 w-3" /> Refund
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}