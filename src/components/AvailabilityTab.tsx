import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Clock, Plus, Trash2, Save, Ban } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

const formatTime12 = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
};

interface AvailabilitySlot {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  slot_duration_minutes: number;
}

interface BlockedSlot {
  id?: string;
  blocked_date: string;
  start_time: string;
  end_time: string;
  reason: string;
}

export default function AvailabilityTab({ agentId }: { agentId: string }) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [slotDuration, setSlotDuration] = useState(30);

  const [blockDate, setBlockDate] = useState<Date>();
  const [blockStart, setBlockStart] = useState("09:00");
  const [blockEnd, setBlockEnd] = useState("17:00");
  const [blockReason, setBlockReason] = useState("");

  useEffect(() => { loadData(); }, [agentId]);

  const loadData = async () => {
    setLoading(true);
    const [availRes, blockedRes] = await Promise.all([
      supabase.from("agent_availability").select("*").eq("agent_id", agentId).order("day_of_week").order("start_time"),
      supabase.from("agent_blocked_slots").select("*").eq("agent_id", agentId).order("blocked_date"),
    ]);

    if (availRes.data && availRes.data.length > 0) {
      const normalizeTime = (t: string) => t ? t.slice(0, 5) : t;
      setSlots(availRes.data.map(s => ({
        id: s.id, day_of_week: s.day_of_week,
        start_time: normalizeTime(s.start_time), end_time: normalizeTime(s.end_time),
        is_available: s.is_available, slot_duration_minutes: s.slot_duration_minutes,
      })));
      setSlotDuration(availRes.data[0].slot_duration_minutes);
    } else {
      const defaults: AvailabilitySlot[] = [];
      for (let d = 1; d <= 5; d++) defaults.push({ day_of_week: d, start_time: "09:00", end_time: "17:00", is_available: true, slot_duration_minutes: 30 });
      for (const d of [0, 6]) defaults.push({ day_of_week: d, start_time: "09:00", end_time: "17:00", is_available: false, slot_duration_minutes: 30 });
      setSlots(defaults);
    }

    if (blockedRes.data) {
      setBlockedSlots(blockedRes.data.map(b => ({
        id: b.id, blocked_date: b.blocked_date, start_time: b.start_time, end_time: b.end_time, reason: b.reason || "",
      })));
    }
    setLoading(false);
  };

  const toggleDay = (dayIdx: number) => {
    setSlots(prev => prev.map(s => s.day_of_week === dayIdx ? { ...s, is_available: !s.is_available } : s));
  };

  const updateSlot = (dayIdx: number, field: "start_time" | "end_time", value: string) => {
    setSlots(prev => prev.map(s => s.day_of_week === dayIdx ? { ...s, [field]: value } : s));
  };

  const saveAvailability = async () => {
    setSaving(true);
    try {
      await supabase.from("agent_availability").delete().eq("agent_id", agentId);
      const rows = slots.map(s => ({
        agent_id: agentId, day_of_week: s.day_of_week, start_time: s.start_time,
        end_time: s.end_time, is_available: s.is_available, slot_duration_minutes: slotDuration,
      }));
      const { error } = await supabase.from("agent_availability").insert(rows);
      if (error) throw error;
      toast({ title: "Availability saved!" });
      await loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const addBlockedSlot = async () => {
    if (!blockDate) { toast({ title: "Select a date", variant: "destructive" }); return; }
    try {
      const { error } = await supabase.from("agent_blocked_slots").insert({
        agent_id: agentId, blocked_date: format(blockDate, "yyyy-MM-dd"),
        start_time: blockStart, end_time: blockEnd, reason: blockReason || null,
      });
      if (error) throw error;
      toast({ title: "Time slot blocked!" });
      setBlockDate(undefined); setBlockReason("");
      await loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const removeBlockedSlot = async (id: string) => {
    await supabase.from("agent_blocked_slots").delete().eq("id", id);
    toast({ title: "Block removed" });
    await loadData();
  };

  if (loading) return <div className="text-center text-muted-foreground py-12">Loading availability...</div>;

  const sortedSlots = [...slots].sort((a, b) => a.day_of_week - b.day_of_week);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Weekly Schedule */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass border-border/50 card-shadow">
          <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
              <div>
                <CardTitle className="font-display text-base sm:text-lg flex items-center gap-2">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /> Weekly Schedule
                </CardTitle>
                <CardDescription className="mt-0.5 text-xs sm:text-sm">Set your available days and hours</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Label className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">Slot</Label>
                  <Select value={String(slotDuration)} onValueChange={v => setSlotDuration(Number(v))}>
                    <SelectTrigger className="w-20 sm:w-24 h-7 sm:h-8 text-[10px] sm:text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="45">45 min</SelectItem>
                      <SelectItem value="60">60 min</SelectItem>
                      <SelectItem value="90">90 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={saveAvailability} disabled={saving} size="sm" className="bg-primary hover:bg-primary/90 gap-1 h-7 sm:h-8 text-xs px-2.5 sm:px-3">
                  <Save className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {saving ? "..." : "Save"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="space-y-1.5 sm:space-y-2">
              {sortedSlots.map((slot) => (
                <div
                  key={slot.day_of_week}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 p-2 sm:p-3 rounded-lg transition-colors",
                    slot.is_available ? "bg-accent/5 border border-accent/20" : "bg-secondary/50 border border-border/30"
                  )}
                >
                  <div className="flex items-center gap-2 sm:gap-3 sm:w-32 shrink-0">
                    <Switch
                      checked={slot.is_available}
                      onCheckedChange={() => toggleDay(slot.day_of_week)}
                      className="scale-90 sm:scale-100"
                    />
                    <span className={cn("font-medium text-xs sm:text-sm", !slot.is_available && "text-muted-foreground")}>
                      <span className="sm:hidden">{SHORT_DAYS[slot.day_of_week]}</span>
                      <span className="hidden sm:inline">{DAYS[slot.day_of_week]}</span>
                    </span>
                  </div>

                  {slot.is_available ? (
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-1 pl-8 sm:pl-0">
                      <Select value={slot.start_time} onValueChange={v => updateSlot(slot.day_of_week, "start_time", v)}>
                        <SelectTrigger className="w-[90px] sm:w-28 h-7 sm:h-8 text-[10px] sm:text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-48">
                          {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{formatTime12(t)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground text-[10px] sm:text-xs">to</span>
                      <Select value={slot.end_time} onValueChange={v => updateSlot(slot.day_of_week, "end_time", v)}>
                        <SelectTrigger className="w-[90px] sm:w-28 h-7 sm:h-8 text-[10px] sm:text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-48">
                          {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{formatTime12(t)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Badge variant="secondary" className="text-[9px] sm:text-xs ml-auto hidden sm:inline-flex">
                        {(() => {
                          const [sh, sm] = slot.start_time.split(":").map(Number);
                          const [eh, em] = slot.end_time.split(":").map(Number);
                          const totalMin = (eh * 60 + em) - (sh * 60 + sm);
                          const slotCount = Math.floor(totalMin / slotDuration);
                          return `${slotCount} slot${slotCount !== 1 ? "s" : ""}`;
                        })()}
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-xs sm:text-sm text-muted-foreground pl-8 sm:pl-0">Unavailable</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Blocked Slots */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="glass border-border/50 card-shadow">
          <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-4">
            <CardTitle className="font-display text-base sm:text-lg flex items-center gap-2">
              <Ban className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" /> Blocked Slots
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Block dates/times for holidays or breaks</CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6 space-y-3 sm:space-y-4">
            {/* Add block form */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-end gap-2 sm:gap-3 p-2.5 sm:p-4 bg-secondary/30 rounded-lg border border-border/30">
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <Label className="text-[10px] sm:text-xs">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full sm:w-40 justify-start text-left text-[10px] sm:text-xs h-7 sm:h-8", !blockDate && "text-muted-foreground")}>
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      {blockDate ? format(blockDate, "MMM d, yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={blockDate} onSelect={setBlockDate} disabled={(d) => d < new Date()} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] sm:text-xs">From</Label>
                <Select value={blockStart} onValueChange={setBlockStart}>
                  <SelectTrigger className="h-7 sm:h-8 text-[10px] sm:text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-48">
                    {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{formatTime12(t)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] sm:text-xs">To</Label>
                <Select value={blockEnd} onValueChange={setBlockEnd}>
                  <SelectTrigger className="h-7 sm:h-8 text-[10px] sm:text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-48">
                    {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{formatTime12(t)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2 sm:flex-1 sm:min-w-[120px]">
                <Label className="text-[10px] sm:text-xs">Reason</Label>
                <Input value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="e.g. Holiday" className="h-7 sm:h-8 text-xs" />
              </div>
              <Button onClick={addBlockedSlot} size="sm" variant="destructive" className="gap-1 h-7 sm:h-8 text-xs col-span-2 sm:col-span-1">
                <Plus className="h-3 w-3" /> Block
              </Button>
            </div>

            {blockedSlots.length === 0 ? (
              <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">No blocked slots</p>
            ) : (
              <div className="space-y-1.5 sm:space-y-2">
                {blockedSlots.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <Ban className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium truncate">
                          {format(new Date(b.blocked_date + "T00:00:00"), "EEE, MMM d, yyyy")}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                          {formatTime12(b.start_time)} – {formatTime12(b.end_time)}
                          {b.reason && ` · ${b.reason}`}
                        </p>
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => b.id && removeBlockedSlot(b.id)} className="h-7 w-7 sm:h-8 sm:w-8 shrink-0">
                      <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}