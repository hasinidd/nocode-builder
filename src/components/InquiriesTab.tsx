import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Inbox, Mail, Phone, User, Clock, Download, MessageSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import NotificationConfig from "@/components/NotificationConfig";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Inquiry {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  subject: string | null;
  message: string | null;
  custom_fields: Record<string, string>;
  status: string;
  created_at: string;
  conversation_id: string | null;
  summary: string | null;
  question_type: string | null;
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-primary/20 text-primary border-primary/30",
  reviewed: "bg-accent/20 text-accent border-accent/30",
  contacted: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  closed: "bg-muted text-muted-foreground border-border",
};

const TYPE_COLORS: Record<string, string> = {
  product: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  service: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  general: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  support: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  pricing: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

export default function InquiriesTab({ agentId }: { agentId: string }) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);

  useEffect(() => { loadInquiries(); }, [agentId]);

  const loadInquiries = async () => {
    const { data } = await supabase
      .from("inquiries").select("*").eq("agent_id", agentId)
      .order("created_at", { ascending: false });
    if (data) setInquiries(data as unknown as Inquiry[]);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("inquiries").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    setInquiries(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    toast({ title: `Status updated to ${status}` });
    import("@/lib/activityLog").then(m => m.logActivity({ action: "inquiry_status_changed", entityType: "inquiry", entityId: id, metadata: { status } }));
  };

  const openChat = async (inquiry: Inquiry) => {
    if (!inquiry.conversation_id) {
      toast({ title: "No conversation linked", description: "This inquiry has no associated chat." });
      return;
    }
    setSelectedInquiry(inquiry);
    setChatOpen(true);
    setChatLoading(true);
    const { data } = await supabase
      .from("messages").select("*").eq("conversation_id", inquiry.conversation_id)
      .order("created_at", { ascending: true });
    setChatMessages((data as ChatMessage[]) || []);
    setChatLoading(false);
  };

  const exportCSV = () => {
    const filtered = getFiltered();
    const headers = ["Name", "Email", "Phone", "Subject", "Summary", "Type", "Message", "Status", "Date"];
    const rows = filtered.map(i => [
      i.customer_name, i.customer_email || "", i.customer_phone || "",
      i.subject || "", (i.summary || "").replace(/,/g, ";"),
      i.question_type || "general",
      (i.message || "").replace(/,/g, ";"),
      i.status, new Date(i.created_at).toLocaleDateString(),
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "inquiries.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const getFiltered = () => filter === "all" ? inquiries : inquiries.filter(i => i.status === filter);
  const filtered = getFiltered();
  const formatDate = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading inquiries...</div>;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: "Total", value: inquiries.length, color: "text-foreground" },
          { label: "New", value: inquiries.filter(i => i.status === "new").length, color: "text-primary" },
          { label: "Reviewed", value: inquiries.filter(i => i.status === "reviewed").length, color: "text-accent" },
          { label: "Contacted", value: inquiries.filter(i => i.status === "contacted").length, color: "text-blue-400" },
        ].map(s => (
          <Card key={s.label} className="glass border-border/50">
            <CardContent className="p-2.5 sm:p-4 text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-lg sm:text-2xl font-display font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-28 sm:w-36 h-7 sm:h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1.5">
          <NotificationConfig agentId={agentId} entityType="inquiry" />
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1 h-7 sm:h-8 text-xs">
            <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Export CSV</span><span className="sm:hidden">CSV</span>
          </Button>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="glass border-border/50">
          <CardContent className="text-center py-10 sm:py-12">
            <Inbox className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No inquiries yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {filtered.map((inq, i) => (
            <motion.div key={inq.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="glass border-border/50 card-shadow">
                <CardContent className="p-2.5 sm:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Name & contact */}
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
                          <span className="font-medium text-xs sm:text-sm">{inq.customer_name || "Anonymous"}</span>
                        </div>
                        {inq.customer_email && (
                          <div className="hidden sm:flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" /> {inq.customer_email}
                          </div>
                        )}
                        {inq.customer_phone && (
                          <div className="hidden sm:flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" /> {inq.customer_phone}
                          </div>
                        )}
                      </div>
                      {/* Mobile contact row */}
                      <div className="flex sm:hidden items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                        {inq.customer_email && (
                          <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3 shrink-0" /> <span className="truncate">{inq.customer_email}</span></span>
                        )}
                        {inq.customer_phone && (
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3 shrink-0" /> {inq.customer_phone}</span>
                        )}
                      </div>
                      {/* Summary */}
                      {inq.summary && <p className="text-xs sm:text-sm font-medium text-foreground line-clamp-2">{inq.summary}</p>}
                      {!inq.summary && inq.subject && <p className="text-xs sm:text-sm font-medium line-clamp-1">{inq.subject}</p>}
                      {inq.message && <p className="text-[10px] sm:text-sm text-muted-foreground line-clamp-2">{inq.message}</p>}
                      {/* Type + custom fields */}
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {inq.question_type && (
                          <Badge variant="outline" className={`text-[9px] sm:text-xs ${TYPE_COLORS[inq.question_type] || TYPE_COLORS.general}`}>
                            {inq.question_type}
                          </Badge>
                        )}
                        {inq.custom_fields && Object.keys(inq.custom_fields).length > 0 &&
                          Object.entries(inq.custom_fields).slice(0, 3).map(([k, v]) => (
                            <Badge key={k} variant="secondary" className="text-[9px] sm:text-xs">{k}: {v}</Badge>
                          ))
                        }
                      </div>
                      <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> {formatDate(inq.created_at)}
                      </div>
                    </div>
                    {/* Right side controls */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Badge variant="outline" className={`text-[9px] sm:text-xs ${STATUS_COLORS[inq.status] || ""}`}>{inq.status}</Badge>
                      <Select value={inq.status} onValueChange={(v) => updateStatus(inq.id, v)}>
                        <SelectTrigger className="h-6 sm:h-7 text-[10px] sm:text-xs w-20 sm:w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="reviewed">Reviewed</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                      {inq.conversation_id && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7" onClick={() => openChat(inq)} title="View Chat">
                          <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Chat Dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
              <MessageSquare className="h-4 w-4" />
              Chat with {selectedInquiry?.customer_name || "Customer"}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[50vh] pr-2 sm:pr-3">
            {chatLoading ? (
              <p className="text-center text-muted-foreground py-8 text-sm">Loading chat...</p>
            ) : chatMessages.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">No messages found</p>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {chatMessages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] sm:max-w-[80%] rounded-xl px-3 py-2 text-xs sm:text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}