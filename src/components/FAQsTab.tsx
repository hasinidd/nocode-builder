import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Sparkles, ListOrdered } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { AgentType } from "@/types/agent";
import FaqSequenceEditor from "@/components/FaqSequenceEditor";

interface FAQ {
  id: string;
  agent_id: string;
  question: string;
  answer: string;
  linked_product_id: string | null;
  is_active: boolean;
  is_sequence: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface LinkableItem {
  id: string;
  name: string;
}

interface FAQsTabProps {
  agentId: string;
  agentType?: AgentType;
  autoOpen?: boolean;
}

export default function FAQsTab({ agentId, agentType, autoOpen = false }: FAQsTabProps) {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [linkableItems, setLinkableItems] = useState<LinkableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);

  // Form state
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [linkedProductId, setLinkedProductId] = useState<string>("none");
  const [isActive, setIsActive] = useState(true);
  const [isSequence, setIsSequence] = useState(false);
  const [savedFaqId, setSavedFaqId] = useState<string | null>(null);

  const isServiceBased = agentType === "booking_agent";
  const linkLabel = isServiceBased ? "Service" : "Product";

  useEffect(() => {
    loadFaqs();
    loadLinkableItems();
    if (autoOpen) {
      setTimeout(() => { setDialogOpen(true); }, 300);
    }
  }, [agentId, agentType]);

  const loadFaqs = async () => {
    const { data } = await supabase
      .from("faqs")
      .select("*")
      .eq("agent_id", agentId)
      .order("sort_order")
      .order("created_at", { ascending: false });
    setFaqs((data as FAQ[]) || []);
    setLoading(false);
  };

  const loadLinkableItems = async () => {
    if (isServiceBased) {
      const { data } = await supabase
        .from("services")
        .select("id, name")
        .eq("agent_id", agentId)
        .order("name");
      setLinkableItems(data || []);
    } else {
      const { data } = await supabase
        .from("products")
        .select("id, name")
        .eq("agent_id", agentId)
        .order("name");
      setLinkableItems(data || []);
    }
  };

  const openAdd = () => {
    setEditingFaq(null);
    setQuestion("");
    setAnswer("");
    setLinkedProductId("none");
    setIsActive(true);
    setIsSequence(false);
    setSavedFaqId(null);
    setDialogOpen(true);
  };

  const openEdit = (faq: FAQ) => {
    setEditingFaq(faq);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setLinkedProductId(faq.linked_product_id || "none");
    setIsActive(faq.is_active);
    setIsSequence(faq.is_sequence || false);
    setSavedFaqId(faq.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!question.trim()) {
      toast({ title: "Error", description: "Question is required", variant: "destructive" });
      return;
    }
    if (!isSequence && !answer.trim()) {
      toast({ title: "Error", description: "Answer is required for non-sequence FAQs", variant: "destructive" });
      return;
    }

    const payload = {
      agent_id: agentId,
      question: question.trim(),
      answer: isSequence ? (answer.trim() || question.trim()) : answer.trim(),
      linked_product_id: linkedProductId === "none" ? null : linkedProductId,
      is_active: isActive,
      is_sequence: isSequence,
    };

    if (editingFaq) {
      const { error } = await supabase.from("faqs").update(payload).eq("id", editingFaq.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      setSavedFaqId(editingFaq.id);
      toast({ title: "FAQ updated" });
      import("@/lib/activityLog").then(m => m.logActivity({ action: "faq_updated", entityType: "faq", entityId: editingFaq.id }));
    } else {
      const { data: inserted, error } = await supabase.from("faqs").insert(payload).select("id").single();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      setSavedFaqId(inserted?.id || null);
      // If sequence mode, set as editing so user can build the sequence
      if (isSequence && inserted) {
        setEditingFaq({ ...payload, id: inserted.id, sort_order: 0, created_at: "", updated_at: "" } as FAQ);
      }
      toast({ title: "FAQ created" });
      import("@/lib/activityLog").then(m => m.logActivity({ action: "faq_added", entityType: "faq", metadata: { question: question.substring(0, 50) } }));
    }

    // Always close after explicit Save/Update — sequence items already auto-save
    setDialogOpen(false);
    loadFaqs();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("faqs").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "FAQ deleted" });
    import("@/lib/activityLog").then(m => m.logActivity({ action: "faq_deleted", entityType: "faq", entityId: id }));
    loadFaqs();
  };

  const getItemName = (itemId: string | null) => {
    if (!itemId) return null;
    return linkableItems.find(p => p.id === itemId)?.name || null;
  };

  if (loading) return <div className="text-muted-foreground text-sm p-4">Loading FAQs...</div>;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">FAQs</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Manage FAQs for the chatbot</p>
        </div>
        <Button onClick={openAdd} className="gap-1.5 shrink-0 h-8 sm:h-9 text-xs sm:text-sm px-2.5 sm:px-4">
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Add FAQ</span><span className="sm:hidden">Add</span>
        </Button>
      </div>

      <div className="border border-border/50 rounded-lg">
        <div className="p-4 border-b border-border/50">
          <h2 className="text-lg font-display font-semibold">FAQ List</h2>
          <p className="text-sm text-muted-foreground">{faqs.length} FAQs configured</p>
        </div>

        {/* Table header */}
        <div className="hidden md:grid grid-cols-[1fr_180px_100px_80px] gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b border-border/30">
          <span>Question</span>
          <span>Linked {linkLabel}</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        {faqs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm space-y-3">
            <p>No FAQs configured yet. Add your first FAQ to help your chatbot answer common questions.</p>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => document.dispatchEvent(new CustomEvent("open-management-assistant"))}>
              <Sparkles className="h-4 w-4" /> Configure via Assistant
            </Button>
          </div>
        ) : (
          faqs.map(faq => (
            <div key={faq.id} className="grid grid-cols-1 md:grid-cols-[1fr_180px_100px_80px] gap-4 px-4 py-4 border-b border-border/30 last:border-0 items-start">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-foreground">{faq.question}</p>
                  {faq.is_sequence && (
                    <Badge variant="outline" className="gap-1 text-[10px] py-0 h-4 border-primary/40 text-primary">
                      <ListOrdered className="h-2.5 w-2.5" /> Sequence
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{faq.answer}</p>
              </div>
              <div className="flex items-center">
                {getItemName(faq.linked_product_id) ? (
                  <span className="text-sm text-muted-foreground">{getItemName(faq.linked_product_id)}</span>
                ) : (
                  <span className="text-sm text-muted-foreground/50">—</span>
                )}
              </div>
              <div>
                <Badge variant={faq.is_active ? "default" : "secondary"}>
                  {faq.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => openEdit(faq)} className="text-muted-foreground hover:text-foreground">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(faq.id)} className="text-destructive hover:text-destructive/80">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFaq ? "Edit FAQ" : "Add New FAQ"}</DialogTitle>
            <DialogDescription>
              {editingFaq ? "Update this FAQ entry" : "Create a new FAQ for your chatbot"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2 bg-secondary/30">
              <div className="flex items-center gap-2">
                <ListOrdered className="h-4 w-4 text-primary" />
                <div>
                  <Label className="text-sm">Sequence mode</Label>
                  <p className="text-xs text-muted-foreground">Send a sequence of text, images, and videos instead of a single answer.</p>
                </div>
              </div>
              <Switch checked={isSequence} onCheckedChange={setIsSequence} />
            </div>

            <div className="space-y-2">
              <Label>Question / Trigger *</Label>
              <Input
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="e.g., What are your shipping options?"
              />
            </div>

            {!isSequence && (
              <div className="space-y-2">
                <Label>Answer *</Label>
                <Textarea
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  placeholder="Provide a detailed answer..."
                  rows={4}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Link to {linkLabel} (Optional)</Label>
                <Select value={linkedProductId} onValueChange={setLinkedProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder={`No ${linkLabel.toLowerCase()} link`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No {linkLabel.toLowerCase()} link</SelectItem>
                    {linkableItems.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Link this FAQ to a specific {linkLabel.toLowerCase()} for contextual responses</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                  <Label>Active</Label>
                </div>
              </div>
            </div>

            {isSequence && savedFaqId && (
              <div className="border-t border-border/50 pt-4">
                <Label className="text-sm mb-2 block">Sequence Items</Label>
                <FaqSequenceEditor agentId={agentId} faqId={savedFaqId} onChange={loadFaqs} />
              </div>
            )}
            {isSequence && !savedFaqId && (
              <div className="border-t border-border/50 pt-4 text-sm text-muted-foreground bg-secondary/30 rounded-md p-3">
                💡 Save the FAQ first, then you'll be able to add sequence items (text, images, videos).
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Close</Button>
            <Button onClick={handleSave}>{editingFaq ? "Update FAQ" : (isSequence ? "Save & Add Items" : "Create FAQ")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
