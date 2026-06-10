import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, FileText, Pencil, Check, X, GripVertical, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface ContentSection {
  id: string;
  title: string;
  default_content: string;
}

interface TemplateField {
  id: string;
  label: string;
  type: string;
  required: boolean;
}

interface DocTemplate {
  id: string;
  agent_id: string;
  name: string;
  template_type: string;
  description: string | null;
  fields: TemplateField[];
  content_sections: ContentSection[];
  styling: Record<string, string>;
  business_info: Record<string, string>;
  is_active: boolean;
  sort_order: number;
}

const TEMPLATE_TYPES = [
  { value: "invoice", label: "📄 Invoice", description: "Itemized bill with totals and payment details" },
  { value: "quotation", label: "💰 Quotation", description: "Price quote for services or products" },
  { value: "receipt", label: "🧾 Receipt", description: "Payment confirmation document" },
  { value: "custom", label: "📋 Custom", description: "Custom document with your own layout" },
];

const DEFAULT_FIELDS: Record<string, TemplateField[]> = {
  invoice: [
    { id: "customer_name", label: "Customer Name", type: "text", required: true },
    { id: "customer_email", label: "Customer Email", type: "email", required: false },
    { id: "customer_phone", label: "Customer Phone", type: "tel", required: false },
    { id: "items", label: "Line Items", type: "items", required: true },
    { id: "due_date", label: "Due Date", type: "date", required: false },
    { id: "notes", label: "Notes", type: "textarea", required: false },
  ],
  quotation: [
    { id: "customer_name", label: "Customer Name", type: "text", required: true },
    { id: "customer_email", label: "Customer Email", type: "email", required: false },
    { id: "items", label: "Line Items", type: "items", required: true },
    { id: "valid_until", label: "Valid Until", type: "date", required: false },
    { id: "notes", label: "Notes", type: "textarea", required: false },
  ],
  receipt: [
    { id: "customer_name", label: "Customer Name", type: "text", required: true },
    { id: "items", label: "Line Items", type: "items", required: true },
    { id: "payment_method", label: "Payment Method", type: "text", required: true },
    { id: "notes", label: "Notes", type: "textarea", required: false },
  ],
  custom: [],
};

export default function DocumentTemplatesTab({ agentId }: { agentId: string }) {
  const [templates, setTemplates] = useState<DocTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("invoice");
  const [newDescription, setNewDescription] = useState("");
  const [newFields, setNewFields] = useState<TemplateField[]>([]);
  const [newSections, setNewSections] = useState<ContentSection[]>([]);
  const [newStyling, setNewStyling] = useState({ primary_color: "#6366f1", accent_color: "#818cf8" });
  const [newBusiness, setNewBusiness] = useState({ company_name: "", email: "", phone: "", address: "", website: "" });

  // Edit state
  const [editTemplate, setEditTemplate] = useState<DocTemplate | null>(null);

  useEffect(() => { loadTemplates(); }, [agentId]);

  const loadTemplates = async () => {
    const { data } = await supabase
      .from("document_templates")
      .select("*")
      .eq("agent_id", agentId)
      .order("sort_order");
    if (data) {
      setTemplates(data.map(d => ({
        ...d,
        fields: (d.fields as any) || [],
        content_sections: (d.content_sections as any) || [],
        styling: (d.styling as any) || {},
        business_info: (d.business_info as any) || {},
      })));
    }
    setLoading(false);
  };

  const initCreateForm = (type: string) => {
    setNewType(type);
    setNewFields(DEFAULT_FIELDS[type] || []);
    setNewSections(type === "quotation" ? [
      { id: "terms", title: "Terms & Conditions", default_content: "This quotation is valid for 30 days from the date of issue." },
    ] : type === "invoice" ? [
      { id: "terms", title: "Terms & Conditions", default_content: "Payment is due within 30 days of invoice date." },
    ] : []);
  };

  const createTemplate = async () => {
    if (!newName.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("document_templates").insert({
      agent_id: agentId,
      name: newName,
      template_type: newType,
      description: newDescription || null,
      fields: newFields as any,
      content_sections: newSections as any,
      styling: newStyling as any,
      business_info: newBusiness as any,
      sort_order: templates.length,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Template created!" });
      setShowCreate(false);
      setNewName("");
      setNewDescription("");
      loadTemplates();
    }
  };

  const updateTemplate = async () => {
    if (!editTemplate) return;
    const { error } = await supabase.from("document_templates").update({
      name: editTemplate.name,
      description: editTemplate.description,
      fields: editTemplate.fields as any,
      content_sections: editTemplate.content_sections as any,
      styling: editTemplate.styling as any,
      business_info: editTemplate.business_info as any,
      is_active: editTemplate.is_active,
    }).eq("id", editTemplate.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Template updated!" });
      setEditingId(null);
      setEditTemplate(null);
      loadTemplates();
    }
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase.from("document_templates").delete().eq("id", id);
    if (!error) {
      toast({ title: "Template deleted" });
      loadTemplates();
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("document_templates").update({ is_active: !current }).eq("id", id);
    loadTemplates();
  };

  if (loading) return <div className="text-center text-muted-foreground py-8">Loading templates...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">Document Templates</h2>
          <p className="text-sm text-muted-foreground">Create PDF templates your agent can generate (invoices, quotations, receipts)</p>
        </div>
        <Button onClick={() => { setShowCreate(true); initCreateForm("invoice"); }} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Template
        </Button>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card className="glass border-border/50 card-shadow">
              <CardHeader>
                <CardTitle className="font-display text-lg">Create Document Template</CardTitle>
                <CardDescription>Set up a template that your agent can use to generate PDFs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Type selection */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {TEMPLATE_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => { setNewType(t.value); initCreateForm(t.value); }}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        newType === t.value ? "border-primary bg-primary/10" : "border-border/50 hover:border-primary/30"
                      }`}
                    >
                      <p className="font-medium text-sm">{t.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Template Name</Label>
                    <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Standard Invoice" />
                  </div>
                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Input value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Brief description" />
                  </div>
                </div>

                {/* Business Info */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Business Information</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input placeholder="Company Name" value={newBusiness.company_name} onChange={e => setNewBusiness({ ...newBusiness, company_name: e.target.value })} />
                    <Input placeholder="Email" value={newBusiness.email} onChange={e => setNewBusiness({ ...newBusiness, email: e.target.value })} />
                    <Input placeholder="Phone" value={newBusiness.phone} onChange={e => setNewBusiness({ ...newBusiness, phone: e.target.value })} />
                    <Input placeholder="Website" value={newBusiness.website} onChange={e => setNewBusiness({ ...newBusiness, website: e.target.value })} />
                    <Input placeholder="Address" value={newBusiness.address} onChange={e => setNewBusiness({ ...newBusiness, address: e.target.value })} className="md:col-span-2" />
                  </div>
                </div>

                {/* Styling */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Colors</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <input type="color" value={newStyling.primary_color} onChange={e => setNewStyling({ ...newStyling, primary_color: e.target.value })} className="w-8 h-8 rounded cursor-pointer" />
                      <span className="text-xs text-muted-foreground">Primary</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="color" value={newStyling.accent_color} onChange={e => setNewStyling({ ...newStyling, accent_color: e.target.value })} className="w-8 h-8 rounded cursor-pointer" />
                      <span className="text-xs text-muted-foreground">Accent</span>
                    </div>
                  </div>
                </div>

                {/* Content Sections */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Content Sections</Label>
                    <Button variant="outline" size="sm" onClick={() => setNewSections([...newSections, { id: `section_${Date.now()}`, title: "", default_content: "" }])}>
                      <Plus className="h-3 w-3 mr-1" /> Add Section
                    </Button>
                  </div>
                  {newSections.map((s, i) => (
                    <div key={s.id} className="flex gap-2 items-start p-2 bg-secondary/30 rounded-lg">
                      <div className="flex-1 space-y-2">
                        <Input placeholder="Section Title" value={s.title} onChange={e => { const n = [...newSections]; n[i] = { ...n[i], title: e.target.value }; setNewSections(n); }} className="text-sm" />
                        <Textarea placeholder="Default content..." value={s.default_content} onChange={e => { const n = [...newSections]; n[i] = { ...n[i], default_content: e.target.value }; setNewSections(n); }} rows={2} className="text-sm" />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setNewSections(newSections.filter((_, j) => j !== i))}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Custom fields for custom type */}
                {newType === "custom" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">Required Fields</Label>
                      <Button variant="outline" size="sm" onClick={() => setNewFields([...newFields, { id: `field_${Date.now()}`, label: "", type: "text", required: false }])}>
                        <Plus className="h-3 w-3 mr-1" /> Add Field
                      </Button>
                    </div>
                    {newFields.map((f, i) => (
                      <div key={f.id} className="flex gap-2 items-center">
                        <Input placeholder="Field label" value={f.label} onChange={e => { const n = [...newFields]; n[i] = { ...n[i], label: e.target.value }; setNewFields(n); }} className="text-sm flex-1" />
                        <Select value={f.type} onValueChange={v => { const n = [...newFields]; n[i] = { ...n[i], type: v }; setNewFields(n); }}>
                          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="tel">Phone</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="textarea">Long Text</SelectItem>
                            <SelectItem value="items">Line Items</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1">
                          <Switch checked={f.required} onCheckedChange={v => { const n = [...newFields]; n[i] = { ...n[i], required: v }; setNewFields(n); }} />
                          <span className="text-xs text-muted-foreground">Req</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setNewFields(newFields.filter((_, j) => j !== i))}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button onClick={createTemplate} className="gap-1.5"><Check className="h-4 w-4" /> Create Template</Button>
                  <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Templates List */}
      {templates.length === 0 && !showCreate ? (
        <Card className="glass border-border/50 card-shadow">
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No document templates yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create templates for invoices, quotations, receipts, or custom documents</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((tpl, i) => (
            <motion.div key={tpl.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              {editingId === tpl.id && editTemplate ? (
                <Card className="glass border-primary/30 card-shadow">
                  <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Template Name</Label>
                        <Input value={editTemplate.name} onChange={e => setEditTemplate({ ...editTemplate, name: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Description</Label>
                        <Input value={editTemplate.description || ""} onChange={e => setEditTemplate({ ...editTemplate, description: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Business Info</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Company Name" value={editTemplate.business_info.company_name || ""} onChange={e => setEditTemplate({ ...editTemplate, business_info: { ...editTemplate.business_info, company_name: e.target.value } })} className="text-sm" />
                        <Input placeholder="Email" value={editTemplate.business_info.email || ""} onChange={e => setEditTemplate({ ...editTemplate, business_info: { ...editTemplate.business_info, email: e.target.value } })} className="text-sm" />
                        <Input placeholder="Phone" value={editTemplate.business_info.phone || ""} onChange={e => setEditTemplate({ ...editTemplate, business_info: { ...editTemplate.business_info, phone: e.target.value } })} className="text-sm" />
                        <Input placeholder="Address" value={editTemplate.business_info.address || ""} onChange={e => setEditTemplate({ ...editTemplate, business_info: { ...editTemplate.business_info, address: e.target.value } })} className="text-sm" />
                      </div>
                    </div>
                    {/* Content sections editor */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Content Sections</Label>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditTemplate({
                          ...editTemplate,
                          content_sections: [...editTemplate.content_sections, { id: `section_${Date.now()}`, title: "", default_content: "" }]
                        })}>
                          <Plus className="h-3 w-3 mr-1" /> Add
                        </Button>
                      </div>
                      {editTemplate.content_sections.map((s, j) => (
                        <div key={s.id} className="flex gap-2 p-2 bg-secondary/30 rounded">
                          <div className="flex-1 space-y-1">
                            <Input placeholder="Title" value={s.title} className="text-xs h-7" onChange={e => {
                              const ns = [...editTemplate.content_sections];
                              ns[j] = { ...ns[j], title: e.target.value };
                              setEditTemplate({ ...editTemplate, content_sections: ns });
                            }} />
                            <Textarea placeholder="Default content" value={s.default_content} rows={2} className="text-xs" onChange={e => {
                              const ns = [...editTemplate.content_sections];
                              ns[j] = { ...ns[j], default_content: e.target.value };
                              setEditTemplate({ ...editTemplate, content_sections: ns });
                            }} />
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditTemplate({
                            ...editTemplate,
                            content_sections: editTemplate.content_sections.filter((_, k) => k !== j)
                          })}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={updateTemplate} className="gap-1"><Check className="h-3.5 w-3.5" /> Save</Button>
                      <Button variant="outline" size="sm" onClick={() => { setEditingId(null); setEditTemplate(null); }}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="glass border-border/50 card-shadow hover:border-primary/20 transition-colors">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="rounded-lg bg-primary/10 p-2.5">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{tpl.name}</p>
                          <Badge variant="outline" className="text-xs capitalize">{tpl.template_type}</Badge>
                          {!tpl.is_active && <Badge variant="secondary" className="text-xs">Disabled</Badge>}
                        </div>
                        {tpl.description && <p className="text-xs text-muted-foreground truncate">{tpl.description}</p>}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {tpl.fields.length} fields · {tpl.content_sections.length} sections
                          {tpl.business_info.company_name ? ` · ${tpl.business_info.company_name}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Switch checked={tpl.is_active} onCheckedChange={() => toggleActive(tpl.id, tpl.is_active)} />
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingId(tpl.id); setEditTemplate(tpl); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteTemplate(tpl.id)}>
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
