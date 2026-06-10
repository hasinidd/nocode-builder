import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical, ClipboardList } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface CollectField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
  sort_order: number;
}

export default function CollectFieldsSection({ agentId }: { agentId: string }) {
  const [fields, setFields] = useState<CollectField[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFields();
  }, [agentId]);

  const loadFields = async () => {
    const { data } = await supabase
      .from("agent_collect_fields")
      .select("*")
      .eq("agent_id", agentId)
      .order("sort_order");
    if (data) setFields(data as CollectField[]);
    setLoading(false);
  };

  const addField = async () => {
    const newField = {
      agent_id: agentId,
      field_name: `field_${Date.now()}`,
      field_label: "New Field",
      field_type: "text",
      is_required: false,
      sort_order: fields.length,
    };
    const { data, error } = await supabase.from("agent_collect_fields").insert(newField).select().single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (data) {
      setFields([...fields, data as CollectField]);
    }
  };

  const updateField = async (id: string, updates: Partial<CollectField>) => {
    await supabase.from("agent_collect_fields").update(updates).eq("id", id);
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const deleteField = async (id: string) => {
    await supabase.from("agent_collect_fields").delete().eq("id", id);
    setFields(prev => prev.filter(f => f.id !== id));
    toast({ title: "Field removed" });
  };

  const addDefaults = async () => {
    const defaults = [
      { field_name: "name", field_label: "Full Name", field_type: "text", is_required: true, sort_order: 0 },
      { field_name: "email", field_label: "Email Address", field_type: "email", is_required: true, sort_order: 1 },
      { field_name: "phone", field_label: "Phone Number", field_type: "phone", is_required: false, sort_order: 2 },
      { field_name: "subject", field_label: "Subject / Reason", field_type: "text", is_required: true, sort_order: 3 },
      { field_name: "message", field_label: "Message / Details", field_type: "textarea", is_required: false, sort_order: 4 },
    ];
    const toInsert = defaults.map(d => ({ ...d, agent_id: agentId }));
    const { data, error } = await supabase.from("agent_collect_fields").insert(toInsert).select();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (data) {
      setFields([...fields, ...(data as CollectField[])]);
      toast({ title: "Default fields added" });
    }
  };

  if (loading) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <Card className="glass border-border/50 card-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              <CardTitle className="font-display text-lg">Information Collection</CardTitle>
            </div>
            <div className="flex gap-2">
              {fields.length === 0 && (
                <Button variant="outline" size="sm" onClick={addDefaults} className="text-xs">
                  Add Defaults
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={addField} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add Field
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Configure what information your agent collects from customers during conversations.
          </p>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <p>No collection fields configured.</p>
              <p className="mt-1">Add fields to enable your agent to collect customer information.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fields.map((field) => (
                <div key={field.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/30">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Label</Label>
                      <Input
                        value={field.field_label}
                        onChange={(e) => updateField(field.id, { field_label: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Type</Label>
                      <Select value={field.field_type} onValueChange={(v) => updateField(field.id, { field_type: v })}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="textarea">Long Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end gap-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={field.is_required}
                          onCheckedChange={(v) => updateField(field.id, { is_required: v })}
                        />
                        <span className="text-xs text-muted-foreground">Required</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteField(field.id)} className="shrink-0">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
