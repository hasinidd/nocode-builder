import { useState, useEffect, useCallback } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSuperAdmin, usePlatformStats, useAllCustomers, useCustomerDetail } from "@/hooks/useSuperAdmin";
import { useImpersonation } from "@/hooks/useImpersonation";
import { supabase } from "@/integrations/supabase/client";
import PackagesManager from "@/components/PackagesManager";
import AiCreditRulesManager from "@/components/AiCreditRulesManager";
import AddonsManager from "@/components/AddonsManager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  LayoutDashboard, Users, BarChart3, CreditCard, MessageSquare,
  Bot, ShoppingCart, CalendarCheck, ArrowLeft, Search,
  ChevronRight, Package, Wrench, HelpCircle, Phone,
  Zap, TrendingUp, DollarSign, Activity, Trash2,
  Clock, FileText, Settings, LogIn, LogOut, Play, Pause, Plus, Pencil, ChevronDown, ChevronUp
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

type Section = "overview" | "customers" | "analytics" | "billing" | "whatsapp" | "packages" | "credits" | "topups";

const NAV_ITEMS: { key: Section; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "customers", label: "Customers", icon: Users },
  { key: "packages", label: "Set Packages", icon: Package },
  { key: "credits", label: "AI Actions", icon: Zap },
  { key: "topups", label: "Top-ups", icon: ShoppingCart },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "billing", label: "Billing", icon: CreditCard },
  { key: "whatsapp", label: "WhatsApp Accounts", icon: Phone },
];

function StatCard({ title, value, icon: Icon, description }: { title: string; value: string | number; icon: React.ElementType; description?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

function OverviewSection() {
  const { stats, loading } = usePlatformStats();
  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading stats...</div>;
  if (!stats) return <div className="text-muted-foreground py-10">No data available.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Platform Overview</h2>
        <p className="text-muted-foreground">Monitor your entire SaaS platform at a glance.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Total Customers" value={stats.total_customers} icon={Users} description="Registered accounts" />
        <StatCard title="Active Bots" value={stats.total_active_bots} icon={Bot} description="Currently deployed" />
        <StatCard title="Messages Processed" value={Number(stats.total_messages).toLocaleString()} icon={MessageSquare} description="All time" />
        <StatCard title="Total Orders" value={stats.total_orders} icon={ShoppingCart} description="Across all agents" />
        <StatCard title="Total Bookings" value={stats.total_bookings} icon={CalendarCheck} description="Across all agents" />
        <StatCard title="Total Revenue" value={`$${Number(stats.total_revenue).toLocaleString()}`} icon={DollarSign} description="From paid orders" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AI Action Usage</CardTitle>
            <CardDescription>Will be available once action tracking is implemented.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Zap className="h-8 w-8" />
              <span className="text-sm">Action tracking coming soon</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">WhatsApp Usage</CardTitle>
            <CardDescription>Will be available once WhatsApp integration is set up.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Phone className="h-8 w-8" />
              <span className="text-sm">WhatsApp tracking coming soon</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  login: LogIn, signup: Users, logout: LogOut,
  agent_created: Plus, agent_updated: Pencil, agent_activated: Play, agent_paused: Pause, agent_reconfigured: Settings,
  product_added: Plus, product_updated: Pencil, product_deleted: Trash2,
  service_added: Plus, service_updated: Pencil, service_deleted: Trash2,
  faq_added: Plus, faq_updated: Pencil, faq_deleted: Trash2,
  order_status_changed: ShoppingCart, booking_status_changed: CalendarCheck, inquiry_status_changed: MessageSquare,
  whatsapp_connected: Phone, stripe_connected: CreditCard, google_calendar_connected: CalendarCheck,
  subscription_changed: Package, profile_updated: Users, availability_updated: Clock,
  page_visited: FileText, welcome_sequence_updated: FileText,
};

const ACTION_COLORS: Record<string, string> = {
  login: "bg-green-500/10 text-green-600", signup: "bg-emerald-500/10 text-emerald-600", logout: "bg-gray-500/10 text-gray-600",
  agent_activated: "bg-green-500/10 text-green-600", agent_paused: "bg-yellow-500/10 text-yellow-600",
  agent_reconfigured: "bg-red-500/10 text-red-600",
  product_added: "bg-blue-500/10 text-blue-600", service_added: "bg-blue-500/10 text-blue-600", faq_added: "bg-blue-500/10 text-blue-600",
  product_deleted: "bg-red-500/10 text-red-600", service_deleted: "bg-red-500/10 text-red-600", faq_deleted: "bg-red-500/10 text-red-600",
  page_visited: "bg-gray-500/10 text-gray-500",
};

function formatAction(action: string): string {
  return action.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function useCustomerActivityLogs(customerId: string | null) {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 30;

  const fetchLogs = useCallback(async (newOffset = 0) => {
    if (!customerId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_customer_activity_logs", {
        _customer_id: customerId,
        _limit: limit,
        _offset: newOffset,
      });
      if (error) throw error;
      const result = data as any;
      setLogs(prev => newOffset === 0 ? (result.logs || []) : [...prev, ...(result.logs || [])]);
      setTotal(result.total || 0);
      setOffset(newOffset);
    } catch (e) {
      console.error("Failed to fetch activity logs:", e);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (customerId) { setLogs([]); setOffset(0); fetchLogs(0); }
  }, [customerId, fetchLogs]);

  return { logs, total, loading, loadMore: () => fetchLogs(offset + limit), hasMore: logs.length < total };
}

function ActivityTimeline({ customerId }: { customerId: string }) {
  const { logs, total, loading, loadMore, hasMore } = useCustomerActivityLogs(customerId);
  const [showPageVisits, setShowPageVisits] = useState(false);

  const filteredLogs = showPageVisits ? logs : logs.filter(l => l.action !== "page_visited");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" /> Activity Log
            </CardTitle>
            <CardDescription>{total} total activities tracked</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowPageVisits(!showPageVisits)} className="text-xs gap-1.5">
            {showPageVisits ? <><ChevronUp className="h-3 w-3" /> Hide Page Visits</> : <><ChevronDown className="h-3 w-3" /> Show Page Visits</>}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && logs.length === 0 ? (
          <div className="text-muted-foreground text-center py-8">Loading activity...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-muted-foreground text-center py-8">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No activity recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-0">
            {filteredLogs.map((log, i) => {
              const Icon = ACTION_ICONS[log.action] || Activity;
              const colorClass = ACTION_COLORS[log.action] || "bg-primary/10 text-primary";
              const meta = log.metadata || {};
              const details: string[] = [];
              if (meta.name) details.push(meta.name);
              if (meta.section) details.push(`Section: ${meta.section}`);
              if (meta.status) details.push(`→ ${meta.status}`);
              if (meta.payment_status) details.push(`Payment → ${meta.payment_status}`);
              if (meta.page) details.push(meta.page);
              if (meta.email && log.action !== "page_visited") details.push(meta.email);
              if (log.entity_type && log.entity_id) details.push(`${log.entity_type}:${log.entity_id.substring(0, 8)}`);

              return (
                <div key={log.id} className="flex gap-3 py-2.5 border-b border-border/30 last:border-0">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{formatAction(log.action)}</p>
                    {details.length > 0 && (
                      <p className="text-xs text-muted-foreground truncate">{details.join(" · ")}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</p>
                    <p className="text-[10px] text-muted-foreground/60">{format(new Date(log.created_at), "HH:mm")}</p>
                  </div>
                </div>
              );
            })}
            {hasMore && (
              <div className="pt-3 text-center">
                <Button variant="outline" size="sm" onClick={loadMore} disabled={loading}>
                  {loading ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChangePlanCard({ customerId, currentPlan }: { customerId: string; currentPlan: string }) {
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: pkgs }, { data: up }] = await Promise.all([
        supabase.from("packages").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("user_packages").select("package_id").eq("user_id", customerId).maybeSingle(),
      ]);
      setPackages(pkgs || []);
      if (up?.package_id) setSelectedId(up.package_id);
      else if (pkgs?.length) {
        // Try match by name
        const match = pkgs.find(p => p.name.toLowerCase() === (currentPlan || "").toLowerCase());
        if (match) setSelectedId(match.id);
      }
      setLoading(false);
    })();
  }, [customerId, currentPlan]);

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("user_packages").select("id").eq("user_id", customerId).maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("user_packages")
          .update({ package_id: selectedId, billing_cycle_start: new Date().toISOString(), ai_credits_used: 0, contacts_used: 0 })
          .eq("user_id", customerId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_packages")
          .insert({ user_id: customerId, package_id: selectedId });
        if (error) throw error;
      }
      toast({ title: "Plan updated", description: "Customer's package changed and usage reset." });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="h-4 w-4" /> Change Plan
        </CardTitle>
        <CardDescription>Manually assign a package to this customer.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading packages...</p>
        ) : (
          <>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger><SelectValue placeholder="Select a package" /></SelectTrigger>
              <SelectContent>
                {packages.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — ${Number(p.price).toFixed(2)}/mo · {p.ai_credits} AI · {p.contacts_limit} contacts
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSave} disabled={saving || !selectedId} className="w-full gap-1.5">
              {saving ? "Saving..." : "Apply Plan Change"}
            </Button>
            <p className="text-xs text-muted-foreground">Changing the plan resets the customer's billing cycle and usage counters.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function GrantFreeActionsCard({ customerId }: { customerId: string }) {
  const [amount, setAmount] = useState<string>("50");
  const [granting, setGranting] = useState(false);
  const [grants, setGrants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGrants = useCallback(async () => {
    const { data } = await supabase
      .from("addon_purchases" as any)
      .select("id, quantity, remaining, purchased_at")
      .eq("user_id", customerId)
      .eq("addon_type", "ai_actions")
      .order("purchased_at", { ascending: false });
    setGrants(((data as any[]) || []));
    setLoading(false);
  }, [customerId]);

  useEffect(() => { loadGrants(); }, [loadGrants]);

  const handleGrant = async () => {
    const qty = parseInt(amount, 10);
    if (!qty || qty <= 0) {
      toast({ title: "Invalid amount", description: "Enter a positive number.", variant: "destructive" });
      return;
    }
    setGranting(true);
    try {
      const { error } = await supabase.from("addon_purchases" as any).insert({
        user_id: customerId,
        addon_type: "ai_actions",
        quantity: qty,
        remaining: qty,
      });
      if (error) throw error;
      toast({ title: "Granted", description: `${qty} free AI Actions added to this customer.` });
      setAmount("50");
      loadGrants();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setGranting(false);
    }
  };

  const totalGranted = grants.reduce((s, g) => s + Number(g.quantity || 0), 0);
  const totalRemaining = grants.reduce((s, g) => s + Number(g.remaining || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="h-4 w-4" /> Grant Free AI Actions
        </CardTitle>
        <CardDescription>Add bonus AI Actions to this customer's balance.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!loading && grants.length > 0 && (
          <div className="rounded-md border border-border/60 p-2.5 text-xs space-y-1 bg-muted/40">
            <div className="flex justify-between"><span className="text-muted-foreground">Total granted</span><span className="font-medium">{totalGranted}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Remaining</span><span className="font-medium text-primary">{totalRemaining}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Grants given</span><span className="font-medium">{grants.length}</span></div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="flex-1"
          />
          <Button onClick={handleGrant} disabled={granting} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> {granting ? "Adding..." : "Grant"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">These actions are added on top of the customer's plan and are consumed after plan credits run out.</p>
      </CardContent>
    </Card>
  );
}

function CustomerDetail({ customerId, onBack }: { customerId: string; onBack: () => void }) {
  const { detail, loading } = useCustomerDetail(customerId);
  const { startImpersonation } = useImpersonation();
  const navigate = useNavigate();

  const handleViewAs = () => {
    if (!detail) return;
    const label = detail.display_name || detail.email || "customer";
    startImpersonation(customerId, label);
    navigate("/dashboard");
    setTimeout(() => window.location.reload(), 50);
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading customer...</div>;
  if (!detail) return <div className="text-muted-foreground py-10">Customer not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{detail.display_name || "Unnamed"}</h2>
          <p className="text-muted-foreground">{detail.email}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" onClick={handleViewAs} className="gap-1.5">
            <LogIn className="h-3.5 w-3.5" /> View as user
          </Button>
          <Badge variant={(detail.plan_tier || "free").toLowerCase() === "free" ? "secondary" : "default"} className="capitalize">
            {detail.plan_tier || "free"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Products" value={detail.total_products} icon={Package} />
        <StatCard title="Services" value={detail.total_services} icon={Wrench} />
        <StatCard title="FAQs" value={detail.total_faqs} icon={HelpCircle} />
        <StatCard title="Messages" value={Number(detail.total_messages).toLocaleString()} icon={MessageSquare} />
        <StatCard title="Orders" value={detail.total_orders} icon={ShoppingCart} />
        <StatCard title="Bookings" value={detail.total_bookings} icon={CalendarCheck} />
        <StatCard title="Revenue" value={`$${Number(detail.total_revenue).toLocaleString()}`} icon={DollarSign} />
        <StatCard title="Member Since" value={format(new Date(detail.created_at), "MMM yyyy")} icon={Activity} />
      </div>

      {/* Activity Timeline */}
      <ActivityTimeline customerId={customerId} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Agents ({detail.agents?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.agents?.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.agents.map((agent: any) => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">{agent.name}</TableCell>
                    <TableCell><Badge variant="outline">{agent.agent_type}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={agent.status === "active" ? "default" : "secondary"}>{agent.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(agent.created_at), "PP")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No agents created yet.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <ChangePlanCard customerId={customerId} currentPlan={detail.plan_tier} />
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Billing Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Current Plan</span><span className="font-medium capitalize">{detail.plan_tier}</span></div>
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Billing Cycle</span><span className="font-medium">Monthly</span></div>
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Payment Status</span><Badge variant="outline">Active</Badge></div>
            <p className="text-xs text-muted-foreground pt-2">Detailed billing data will be available once Stripe integration is enhanced.</p>
          </CardContent>
        </Card>
        <GrantFreeActionsCard customerId={customerId} />
      </div>
    </div>
  );
}

function CustomersSection() {
  const { customers, loading } = useAllCustomers();
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const { startImpersonation } = useImpersonation();
  const navigate = useNavigate();

  if (selectedCustomer) {
    return <CustomerDetail customerId={selectedCustomer} onBack={() => setSelectedCustomer(null)} />;
  }

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      (c.display_name || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.plan_tier || "").toLowerCase().includes(q)
    );
  });

  const viewAs = (e: React.MouseEvent, c: any) => {
    e.stopPropagation();
    const label = c.display_name || c.email || "customer";
    startImpersonation(c.user_id, label);
    navigate("/dashboard");
    setTimeout(() => window.location.reload(), 50);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Customers</h2>
        <p className="text-muted-foreground">Manage and view all platform customers.</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search customers..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Badge variant="outline">{customers.length} total</Badge>
      </div>

      {loading ? (
        <div className="text-muted-foreground py-10 text-center">Loading customers...</div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Agents</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No customers found.</TableCell></TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.user_id} className="cursor-pointer" onClick={() => setSelectedCustomer(c.user_id)}>
                    <TableCell className="font-medium">{c.display_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.email}</TableCell>
                    <TableCell><Badge variant={(c.plan_tier || "free").toLowerCase() === "free" ? "secondary" : "default"} className="capitalize">{c.plan_tier || "free"}</Badge></TableCell>
                    <TableCell>{c.agent_count}</TableCell>
                    <TableCell>{c.active_agents}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(c.created_at), "PP")}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={(e) => viewAs(e, c)} className="gap-1.5 h-7">
                        <LogIn className="h-3 w-3" /> View as
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function AnalyticsSection() {
  const { stats, loading } = usePlatformStats();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
        <p className="text-muted-foreground">Platform-wide analytics and trends.</p>
      </div>
      {loading ? (
        <div className="text-muted-foreground py-10 text-center">Loading...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Avg Bots per Customer" value={stats?.total_customers ? (stats.total_active_bots / stats.total_customers).toFixed(1) : "0"} icon={TrendingUp} />
          <StatCard title="Avg Messages per Bot" value={stats?.total_active_bots ? Math.round(stats.total_messages / stats.total_active_bots).toLocaleString() : "0"} icon={MessageSquare} />
          <StatCard title="Avg Revenue per Customer" value={stats?.total_customers ? `$${(stats.total_revenue / stats.total_customers).toFixed(2)}` : "$0"} icon={DollarSign} />
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detailed Analytics</CardTitle>
          <CardDescription>Charts and trend analysis will be added here.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mr-3 opacity-30" />
            <span>Charts coming soon</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BillingSection() {
  const { customers, loading } = useAllCustomers();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Billing</h2>
        <p className="text-muted-foreground">View billing status across all customers.</p>
      </div>
      {loading ? (
        <div className="text-muted-foreground py-10 text-center">Loading...</div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.user_id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{c.display_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={(c.plan_tier || "free").toLowerCase() === "free" ? "secondary" : "default"} className="capitalize">{c.plan_tier || "free"}</Badge></TableCell>
                  <TableCell><Badge variant="outline">Active</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{format(new Date(c.created_at), "PP")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      <p className="text-xs text-muted-foreground">Detailed billing data (payment history, invoices) will be available once Stripe billing tracking is enhanced.</p>
    </div>
  );
}

function WhatsAppSection() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newToken, setNewToken] = useState("");

  const loadAccounts = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("get_wasender_stats");
      if (error) throw error;
      setAccounts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load wasender accounts:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync real session counts from WasenderAPI
  const syncFromApi = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await supabase.functions.invoke("whatsapp-manage", {
        body: { action: "sync_accounts" },
      });
      if (res.data?.success && Array.isArray(res.data.data)) {
        setAccounts((prev) =>
          prev.map((acc) => {
            const synced = res.data.data.find((s: any) => s.account_id === acc.id);
            if (synced && synced.api_total_sessions !== null) {
              return {
                ...acc,
                used_sessions: synced.api_total_sessions,
                connected_sessions: synced.api_connected,
              };
            }
            return acc;
          })
        );
      }
    } catch (e) {
      console.error("Failed to sync from API:", e);
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts().then(() => syncFromApi());
  }, [loadAccounts, syncFromApi]);

  const addAccount = async () => {
    if (!newName.trim() || !newToken.trim()) return;
    setAdding(true);
    try {
      const res = await supabase.functions.invoke("whatsapp-manage", {
        body: { action: "add_account", account_name: newName.trim(), access_token: newToken.trim() },
      });
      if (res.error || !res.data?.success) throw new Error(res.data?.error || "Failed to add account");
      setNewName("");
      setNewToken("");
      await loadAccounts();
      await syncFromApi();
    } catch (err: any) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const deleteAccount = async (accountId: string) => {
    if (!confirm("Delete this WhatsApp account?")) return;
    try {
      const res = await supabase.functions.invoke("whatsapp-manage", {
        body: { action: "delete_account", account_id: accountId },
      });
      if (res.error || !res.data?.success) throw new Error(res.data?.error || "Failed");
      await loadAccounts();
    } catch (err: any) {
      console.error(err);
    }
  };

  const toggleAccount = async (accountId: string, currentActive: boolean) => {
    try {
      await supabase.functions.invoke("whatsapp-manage", {
        body: { action: "toggle_account", account_id: accountId, is_active: !currentActive },
      });
      await loadAccounts();
    } catch (err: any) {
      console.error(err);
    }
  };

  const totalSlots = accounts.reduce((sum, a) => sum + (a.max_sessions || 0), 0);
  const totalUsed = accounts.reduce((sum, a) => sum + (a.used_sessions || 0), 0);
  const totalConnected = accounts.reduce((sum, a) => sum + (a.connected_sessions || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">WhatsApp Accounts</h2>
          <p className="text-muted-foreground">Manage WasenderAPI access tokens. Session counts are synced from the API.</p>
        </div>
        <Button variant="outline" size="sm" onClick={syncFromApi} disabled={syncing}>
          {syncing ? "Syncing..." : "Refresh from API"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total Accounts" value={accounts.length} icon={Phone} />
        <StatCard title="Sessions Used" value={`${totalUsed} / ${totalSlots}`} icon={Users} description={`${totalConnected} connected`} />
        <StatCard title="Available Slots" value={totalSlots - totalUsed} icon={Zap} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add WhatsApp Account</CardTitle>
          <CardDescription>Add a WasenderAPI access token. Session limits and usage will be auto-detected from the API.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Account name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Input placeholder="WasenderAPI access token" value={newToken} onChange={(e) => setNewToken(e.target.value)} type="password" />
          </div>
          <Button onClick={addAccount} disabled={adding || !newName.trim() || !newToken.trim()}>
            {adding ? "Adding..." : "Add Account"}
          </Button>
        </CardContent>
      </Card>

      {/* Account List */}
      {loading ? (
        <div className="text-muted-foreground py-10 text-center">Loading accounts...</div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center text-muted-foreground">
              <Phone className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No WhatsApp accounts added yet.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Connected</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.account_name}</TableCell>
                  <TableCell>{a.used_sessions} / {a.max_sessions}</TableCell>
                  <TableCell>{a.connected_sessions}</TableCell>
                  <TableCell>
                    <Badge variant={a.is_active ? "default" : "secondary"} className="cursor-pointer" onClick={() => toggleAccount(a.id, a.is_active)}>
                      {a.is_active ? "Active" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{format(new Date(a.created_at), "PP")}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => deleteAccount(a.id)} className="h-8 w-8 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
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

export default function SuperAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, loading: roleLoading } = useSuperAdmin();
  const [section, setSection] = useState<Section>("overview");

  if (authLoading || roleLoading || isSuperAdmin === null) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Verifying access...</div>;
  }

  if (!user || !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-lg font-bold tracking-tight">Super Admin</h1>
          <p className="text-xs text-muted-foreground">Platform Management</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => setSection(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                section === item.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => window.location.href = "/dashboard"}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        <ScrollArea className="h-screen">
          <div className="p-8 max-w-6xl">
            {section === "overview" && <OverviewSection />}
            {section === "customers" && <CustomersSection />}
            {section === "packages" && <PackagesManager />}
            {section === "credits" && <AiCreditRulesManager />}
            {section === "topups" && <AddonsManager />}
            {section === "analytics" && <AnalyticsSection />}
            {section === "billing" && <BillingSection />}
            {section === "whatsapp" && <WhatsAppSection />}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
