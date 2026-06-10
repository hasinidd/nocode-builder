import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Settings2, Loader2 } from "lucide-react";

interface FollowUpRule {
  id?: string;
  agent_id: string;
  is_enabled: boolean;
  interval_minutes: number;
  max_sends: number;
  message_template: string;
}

export default function FollowUpConfig({ agentId }: { agentId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rule, setRule] = useState<FollowUpRule>({
    agent_id: agentId,
    is_enabled: false,
    interval_minutes: 60,
    max_sends: 2,
    message_template: "",
  });

  useEffect(() => {
    if (open) loadRule();
  }, [open]);

  const loadRule = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("followup_rules" as any)
      .select("*")
      .eq("agent_id", agentId)
      .maybeSingle();
    if (data) {
      setRule(data as any);
    }
    setLoading(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload: any = {
        agent_id: agentId,
        is_enabled: rule.is_enabled,
        interval_minutes: Math.max(30, rule.interval_minutes),
        max_sends: Math.max(1, Math.min(10, rule.max_sends)),
        message_template: rule.message_template,
        updated_at: new Date().toISOString(),
      };

      if (rule.id) {
        await supabase.from("followup_rules" as any).update(payload).eq("id", rule.id);
      } else {
        await supabase.from("followup_rules" as any).insert(payload);
      }
      toast({ title: "Follow-up settings saved" });
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Settings2 className="h-3.5 w-3.5" />
          Follow-up
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Follow-up Messages</DialogTitle>
          <DialogDescription>
            Automatically send follow-up messages to inactive conversations. Follow-ups skip customers who have already placed orders or bookings. Only 1 follow-up per phone number within 30 minutes.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="followup-enabled">Enable Follow-ups</Label>
              <Switch
                id="followup-enabled"
                checked={rule.is_enabled}
                onCheckedChange={(v) => setRule({ ...rule, is_enabled: v })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Time interval (minutes)</Label>
              <Input
                type="number"
                min={30}
                value={rule.interval_minutes}
                onChange={(e) => setRule({ ...rule, interval_minutes: parseInt(e.target.value) || 60 })}
              />
              <p className="text-xs text-muted-foreground">
                How long to wait after the last message before sending a follow-up. Minimum 30 minutes.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Max follow-ups per conversation</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={rule.max_sends}
                onChange={(e) => setRule({ ...rule, max_sends: parseInt(e.target.value) || 2 })}
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of follow-up messages to send per conversation (1-10).
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Message template (optional)</Label>
              <Textarea
                placeholder="Leave empty to auto-generate from chat context. Or write a template like: Hey {{name}}, just checking in! Is there anything else I can help you with?"
                value={rule.message_template}
                onChange={(e) => setRule({ ...rule, message_template: e.target.value })}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Use {"{{name}}"} for the customer name. Leave empty to let AI generate contextual follow-ups.
              </p>
            </div>

            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Safety rules:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>No follow-ups to customers with orders or bookings</li>
                <li>Only WhatsApp conversations are followed up</li>
              </ul>
            </div>

            <Button onClick={save} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Settings
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
