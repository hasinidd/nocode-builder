import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { Bell, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Template {
  id?: string;
  agent_id: string;
  entity_type: string;
  event_key: string;
  is_enabled: boolean;
  message_template: string;
  channel: string;
  delay_minutes: number;
}

const EVENT_CONFIGS: Record<string, { label: string; events: { key: string; label: string; defaultMsg: string; defaultDelay: number }[] }> = {
  booking: {
    label: "Booking",
    events: [
      { key: "confirmed", label: "Booking Confirmed", defaultMsg: "Hi {{name}}, your booking on {{date}} at {{time}} is confirmed! ✅", defaultDelay: 0 },
      { key: "cancelled", label: "Booking Cancelled", defaultMsg: "Hi {{name}}, your booking on {{date}} has been cancelled.", defaultDelay: 0 },
      { key: "reminder", label: "Reminder (before appointment)", defaultMsg: "Hi {{name}}, just a reminder about your appointment tomorrow at {{time}}! 📅", defaultDelay: 1440 },
      { key: "completed", label: "Booking Completed", defaultMsg: "Hi {{name}}, thank you for visiting us! We hope you had a great experience. ⭐", defaultDelay: 0 },
    ],
  },
  order: {
    label: "Order",
    events: [
      { key: "confirmed", label: "Order Confirmed", defaultMsg: "Hi {{name}}, your order #{{order_number}} has been confirmed! 🛒", defaultDelay: 0 },
      { key: "preparing", label: "Order Preparing", defaultMsg: "Hi {{name}}, your order #{{order_number}} is being prepared! 👨‍🍳", defaultDelay: 0 },
      { key: "shipped", label: "Order Shipped", defaultMsg: "Hi {{name}}, your order #{{order_number}} has been shipped! 📦", defaultDelay: 0 },
      { key: "delivered", label: "Order Delivered", defaultMsg: "Hi {{name}}, your order #{{order_number}} has been delivered! Enjoy! 🎉", defaultDelay: 0 },
      { key: "cancelled", label: "Order Cancelled", defaultMsg: "Hi {{name}}, your order #{{order_number}} has been cancelled.", defaultDelay: 0 },
    ],
  },
  inquiry: {
    label: "Inquiry",
    events: [
      { key: "new", label: "Inquiry Received", defaultMsg: "Hi {{name}}, we've received your inquiry and will get back to you shortly! 📩", defaultDelay: 0 },
      { key: "reviewed", label: "Inquiry Reviewed", defaultMsg: "Hi {{name}}, we've reviewed your inquiry and will contact you soon.", defaultDelay: 0 },
      { key: "contacted", label: "Customer Contacted", defaultMsg: "Hi {{name}}, we've tried to reach out to you regarding your inquiry.", defaultDelay: 0 },
    ],
  },
};

export default function NotificationConfig({ agentId, entityType }: { agentId: string; entityType: "booking" | "order" | "inquiry" }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);

  const config = EVENT_CONFIGS[entityType];

  useEffect(() => {
    if (open) loadTemplates();
  }, [open]);

  const loadTemplates = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("notification_templates" as any)
      .select("*")
      .eq("agent_id", agentId)
      .eq("entity_type", entityType);

    const existing = (data as any[] || []);
    const merged = config.events.map(evt => {
      const found = existing.find((t: any) => t.event_key === evt.key);
      return found || {
        agent_id: agentId,
        entity_type: entityType,
        event_key: evt.key,
        is_enabled: false,
        message_template: evt.defaultMsg,
        channel: "whatsapp",
        delay_minutes: evt.defaultDelay,
      };
    });
    setTemplates(merged as Template[]);
    setLoading(false);
  };

  const updateTemplate = (eventKey: string, field: string, value: any) => {
    setTemplates(prev => prev.map(t =>
      t.event_key === eventKey ? { ...t, [field]: value } : t
    ));
  };

  const save = async () => {
    setSaving(true);
    try {
      for (const t of templates) {
        const payload: any = {
          agent_id: agentId,
          entity_type: entityType,
          event_key: t.event_key,
          is_enabled: t.is_enabled,
          message_template: t.message_template,
          channel: t.channel,
          delay_minutes: Math.max(0, t.delay_minutes),
          updated_at: new Date().toISOString(),
        };

        if (t.id) {
          await supabase.from("notification_templates" as any).update(payload).eq("id", t.id);
        } else {
          await supabase.from("notification_templates" as any).upsert(payload, { onConflict: "agent_id,entity_type,event_key" });
        }
      }
      toast({ title: "Notification settings saved" });
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = templates.filter(t => t.is_enabled).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-7 sm:h-8 text-xs">
          <Bell className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Notifications</span>
          <span className="sm:hidden">Notify</span>
          {enabledCount > 0 && (
            <Badge variant="secondary" className="h-4 px-1 text-[9px] ml-0.5">{enabledCount}</Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Bell className="h-4 w-4" />
            {config.label} Notifications
          </DialogTitle>
          <DialogDescription className="text-xs">
            Configure automatic WhatsApp messages sent when {config.label.toLowerCase()} status changes. Use {"{{name}}"} for customer name.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {templates.map(t => {
              const evt = config.events.find(e => e.key === t.event_key);
              if (!evt) return null;
              return (
                <div key={t.event_key} className="rounded-lg border border-border/60 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium">{evt.label}</p>
                      {t.event_key === "reminder" && (
                        <p className="text-[10px] text-muted-foreground">Sent before the scheduled time</p>
                      )}
                    </div>
                    <Switch
                      checked={t.is_enabled}
                      onCheckedChange={(v) => updateTemplate(t.event_key, "is_enabled", v)}
                    />
                  </div>

                  {t.is_enabled && (
                    <>
                      <Textarea
                        value={t.message_template}
                        onChange={(e) => updateTemplate(t.event_key, "message_template", e.target.value)}
                        rows={2}
                        className="text-xs"
                        placeholder={evt.defaultMsg}
                      />
                      {t.event_key === "reminder" && (
                        <div className="flex items-center gap-2">
                          <Label className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">Send before (minutes)</Label>
                          <Input
                            type="number"
                            min={30}
                            value={t.delay_minutes}
                            onChange={(e) => updateTemplate(t.event_key, "delay_minutes", parseInt(e.target.value) || 60)}
                            className="h-7 text-xs w-24"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}

            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Available variables:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>{"{{name}}"} — Customer name</li>
                {entityType === "booking" && (
                  <>
                    <li>{"{{date}}"} — Booking date</li>
                    <li>{"{{time}}"} — Booking time</li>
                  </>
                )}
                {entityType === "order" && (
                  <li>{"{{order_number}}"} — Order number</li>
                )}
              </ul>
            </div>

            <Button onClick={save} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Notification Settings
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
