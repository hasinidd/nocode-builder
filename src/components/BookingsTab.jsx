import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Calendar as CalendarIcon, Clock, User, Phone, Mail,
  Check, X, AlertCircle, Plus, Trash2, FileText
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { format, isBefore, isToday, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import NotificationConfig from "@/components/NotificationConfig";

interface Booking {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  created_at: string;
}

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  currency: string;
}

interface AvailabilitySlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  slot_duration_minutes: number;
}

interface BlockedSlot {
  blocked_date: string;
  start_time: string;
  end_time: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  confirmed: { label: "Confirmed", color: "bg-accent/20 text-accent border-accent/30", icon: Check },
  cancelled: { label: "Cancelled", color: "bg-destructive/20 text-destructive border-destructive/30", icon: X },
  completed: { label: "Completed", color: "bg-primary/20 text-primary border-primary/30", icon: Check },
  no_show: { label: "No Show", color: "bg-muted text-muted-foreground border-border", icon: AlertCircle },
};

const formatTime12 = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
};

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const totalMin = h * 60 + m + minutes;
  const newH = Math.floor(totalMin / 60) % 24;
  const newM = totalMin % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export default function BookingsTab({ agentId }: { agentId: string }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming");
  const [showAddForm, setShowAddForm] = useState(false);

  const [services, setServices] = useState<Service[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);

  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newDate, setNewDate] = useState<Date>();
  const [newStart, setNewStart] = useState("");
  const [newNotes, setNewNotes] = useState("");

  useEffect(() => { loadBookings(); loadServices(); loadAvailability(); loadBlockedSlots(); }, [agentId]);

  const loadBookings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bookings").select("*").eq("agent_id", agentId)
      .order("booking_date", { ascending: true })
      .order("start_time", { ascending: true });
    if (data) setBookings(data as Booking[]);
    setLoading(false);
  };

  const loadServices = async () => {
    const { data } = await supabase
      .from("services").select("id, name, duration_minutes, price, currency")
      .eq("agent_id", agentId).eq("is_available", true)
      .order("sort_order");
    if (data) setServices(data);
  };

  const loadAvailability = async () => {
    const { data } = await supabase
      .from("agent_availability").select("day_of_week, start_time, end_time, is_available, slot_duration_minutes")
      .eq("agent_id", agentId);
    if (data) setAvailability(data as AvailabilitySlot[]);
  };

  const loadBlockedSlots = async () => {
    const { data } = await supabase
      .from("agent_blocked_slots").select("blocked_date, start_time, end_time")
      .eq("agent_id", agentId);
    if (data) setBlockedSlots(data);
  };

  const selectedService = services.find(s => s.id === selectedServiceId);
  const duration = selectedService?.duration_minutes || 30;

  // Compute available time slots for the selected date
  const availableSlots = useMemo(() => {
    if (!newDate) return [];

    const dayOfWeek = newDate.getDay(); // 0=Sun
    const dayAvail = availability.find(a => a.day_of_week === dayOfWeek && a.is_available);
    if (!dayAvail) return [];

    const dateStr = format(newDate, "yyyy-MM-dd");

    // Get existing bookings for this date (non-cancelled)
    const dayBookings = bookings.filter(b =>
      b.booking_date === dateStr && b.status !== "cancelled"
    );

    // Get blocked slots for this date
    const dayBlocked = blockedSlots.filter(b => b.blocked_date === dateStr);

    // Generate slots
    const slots: string[] = [];
    const availStart = timeToMinutes(dayAvail.start_time);
    const availEnd = timeToMinutes(dayAvail.end_time);
    const slotStep = dayAvail.slot_duration_minutes || 30;

    for (let t = availStart; t + duration <= availEnd; t += slotStep) {
      const slotStart = `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
      const slotEndMin = t + duration;
      const slotEnd = `${String(Math.floor(slotEndMin / 60)).padStart(2, "0")}:${String(slotEndMin % 60).padStart(2, "0")}`;

      // Check if slot overlaps with any existing booking
      const isBooked = dayBookings.some(b => {
        const bStart = timeToMinutes(b.start_time);
        const bEnd = timeToMinutes(b.end_time);
        return t < bEnd && slotEndMin > bStart;
      });

      // Check if slot overlaps with any blocked slot
      const isBlocked = dayBlocked.some(b => {
        const bStart = timeToMinutes(b.start_time);
        const bEnd = timeToMinutes(b.end_time);
        return t < bEnd && slotEndMin > bStart;
      });

      if (!isBooked && !isBlocked) {
        slots.push(slotStart);
      }
    }

    return slots;
  }, [newDate, availability, bookings, blockedSlots, duration]);

  // Determine which days are disabled (no availability)
  const availableDays = useMemo(() => {
    return new Set(availability.filter(a => a.is_available).map(a => a.day_of_week));
  }, [availability]);

  const isDayDisabled = (date: Date) => {
    if (date < new Date()) return true;
    return !availableDays.has(date.getDay());
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", bookingId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: `Booking ${status}` }); import("@/lib/activityLog").then(m => m.logActivity({ action: "booking_status_changed", entityType: "booking", entityId: bookingId, metadata: { status } })); await loadBookings(); }
  };

  const deleteBooking = async (bookingId: string) => {
    const { error } = await supabase.from("bookings").delete().eq("id", bookingId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Booking deleted" }); await loadBookings(); }
  };

  const addBooking = async () => {
    if (!newName.trim() || !newDate || !newStart) {
      toast({ title: "Name, date, and time slot are required", variant: "destructive" });
      return;
    }
    const endTime = addMinutesToTime(newStart, duration);
    const serviceName = selectedService?.name;
    const noteParts: string[] = [];
    if (serviceName) noteParts.push(`Service: ${serviceName}`);
    if (newNotes.trim()) noteParts.push(newNotes.trim());

    const { error } = await supabase.from("bookings").insert({
      agent_id: agentId,
      customer_name: newName.trim(),
      customer_email: newEmail.trim() || null,
      customer_phone: newPhone.trim() || null,
      booking_date: format(newDate, "yyyy-MM-dd"),
      start_time: newStart, end_time: endTime,
      notes: noteParts.join(" | ") || null,
      status: "confirmed",
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Booking added!", description: `${format(newDate, "MMM d")} at ${formatTime12(newStart)} – ${formatTime12(endTime)}` });
      import("@/lib/activityLog").then(m => m.logActivity({ action: "booking_created", entityType: "booking", metadata: { service: serviceName, date: format(newDate, "yyyy-MM-dd"), time: newStart } }));
      resetForm();
      setShowAddForm(false);
      await loadBookings();
    }
  };

  const resetForm = () => {
    setNewName(""); setNewEmail(""); setNewPhone("");
    setNewDate(undefined); setNewStart(""); setNewNotes("");
    setSelectedServiceId("");
  };

  const today = startOfDay(new Date());
  const filteredBookings = bookings.filter(b => {
    const bDate = new Date(b.booking_date + "T00:00:00");
    if (filter === "upcoming") return !isBefore(bDate, today) && b.status !== "cancelled";
    if (filter === "past") return isBefore(bDate, today) || b.status === "completed" || b.status === "cancelled";
    return true;
  });

  const stats = {
    total: bookings.length,
    upcoming: bookings.filter(b => !isBefore(new Date(b.booking_date + "T00:00:00"), today) && b.status === "confirmed").length,
    completed: bookings.filter(b => b.status === "completed").length,
    cancelled: bookings.filter(b => b.status === "cancelled").length,
  };

  if (loading) return <div className="text-center text-muted-foreground py-12">Loading bookings...</div>;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Upcoming", value: stats.upcoming, color: "text-accent" },
          { label: "Completed", value: stats.completed, color: "text-primary" },
          { label: "Cancelled", value: stats.cancelled, color: "text-destructive" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="glass border-border/50">
              <CardContent className="p-2.5 sm:p-4 text-center">
                <p className={cn("text-lg sm:text-2xl font-display font-bold", s.color)}>{s.value}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filter & Add */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-0.5 sm:gap-1 bg-secondary/50 rounded-lg p-0.5 sm:p-1">
          {(["upcoming", "all", "past"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors capitalize",
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}>{f}</button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <NotificationConfig agentId={agentId} entityType="booking" />
          <Button size="sm" onClick={() => { resetForm(); setShowAddForm(true); }} className="gap-1 bg-primary hover:bg-primary/90 h-7 sm:h-8 text-xs px-2.5 sm:px-3">
            <Plus className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Add Booking</span><span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Add Booking Dialog */}
      <Dialog open={showAddForm} onOpenChange={(open) => { setShowAddForm(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">New Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Service Selection */}
            {services.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs font-medium">Service</Label>
                <Select value={selectedServiceId} onValueChange={(v) => { setSelectedServiceId(v); setNewStart(""); }}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select a service (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific service</SelectItem>
                    {services.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} — {s.duration_minutes}min — {s.currency} {s.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedService && (
                  <p className="text-[10px] text-muted-foreground">
                    Duration: {selectedService.duration_minutes} minutes
                  </p>
                )}
              </div>
            )}

            {/* Customer Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Name *</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="John Doe" className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="john@email.com" className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+1 234 567" className="h-8 text-xs" />
              </div>
            </div>

            {/* Date Picker */}
            <div className="space-y-1">
              <Label className="text-xs">Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left text-xs h-9", !newDate && "text-muted-foreground")}>
                    <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                    {newDate ? format(newDate, "EEEE, MMMM d, yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newDate}
                    onSelect={(d) => { setNewDate(d); setNewStart(""); }}
                    disabled={isDayDisabled}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {availability.length > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  Only days with configured availability are selectable
                </p>
              )}
            </div>

            {/* Time Slots */}
            {newDate && (
              <div className="space-y-1.5">
                <Label className="text-xs">Available Time Slots *</Label>
                {availableSlots.length === 0 ? (
                  <p className="text-xs text-destructive">No available slots for this date. All slots are booked or blocked.</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
                    {availableSlots.map(slot => {
                      const endTime = addMinutesToTime(slot, duration);
                      const isSelected = newStart === slot;
                      return (
                        <button
                          key={slot}
                          onClick={() => setNewStart(slot)}
                          className={cn(
                            "px-2 py-2 rounded-md text-[11px] font-medium border transition-all",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-secondary/50 text-foreground border-border hover:border-primary/50 hover:bg-secondary"
                          )}
                        >
                          <div>{formatTime12(slot)}</div>
                          <div className="text-[9px] opacity-70">to {formatTime12(endTime)}</div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Input value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Optional notes" className="h-8 text-xs" />
            </div>

            {/* Summary */}
            {newStart && newDate && (
              <div className="bg-secondary/30 rounded-lg p-3 text-xs space-y-1 border border-border/50">
                <p className="font-medium text-foreground">Booking Summary</p>
                {selectedService && <p className="text-muted-foreground">Service: {selectedService.name}</p>}
                <p className="text-muted-foreground">Date: {format(newDate, "EEEE, MMM d, yyyy")}</p>
                <p className="text-muted-foreground">Time: {formatTime12(newStart)} – {formatTime12(addMinutesToTime(newStart, duration))}</p>
                <p className="text-[10px] text-muted-foreground mt-1">This slot will be automatically blocked for the WhatsApp agent</p>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowAddForm(false)}>Cancel</Button>
              <Button size="sm" className="h-8 text-xs bg-primary hover:bg-primary/90" onClick={addBooking} disabled={!newStart || !newDate || !newName.trim()}>
                Confirm Booking
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <Card className="glass border-border/50 card-shadow">
          <CardContent className="text-center py-10 sm:py-12">
            <CalendarIcon className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No {filter !== "all" ? filter : ""} bookings</p>
            <p className="text-xs text-muted-foreground mt-1">
              {filter === "upcoming" ? "Bookings will appear when customers book" : "Try changing the filter"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredBookings.map((booking, i) => {
            const sc = STATUS_CONFIG[booking.status] || STATUS_CONFIG.confirmed;
            const bookingDate = new Date(booking.booking_date + "T00:00:00");
            const isPast = isBefore(bookingDate, today) && !isToday(bookingDate);

            return (
              <motion.div key={booking.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className={cn("glass border-border/50 card-shadow hover:border-primary/30 transition-colors", isPast && "opacity-70")}>
                  <CardContent className="p-2.5 sm:p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className="rounded-full bg-primary/10 p-1.5 sm:p-2 shrink-0 mt-0.5">
                          <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <p className="font-medium text-xs sm:text-sm">{booking.customer_name}</p>
                            <Badge variant="outline" className={cn("text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0", sc.color)}>{sc.label}</Badge>
                            {isToday(bookingDate) && (
                              <Badge className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 bg-accent/20 text-accent border-accent/30">Today</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3 mt-1 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {format(bookingDate, "EEE, MMM d")}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime12(booking.start_time)} – {formatTime12(booking.end_time)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3 mt-0.5 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                            {booking.customer_email && (
                              <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3 shrink-0" /> <span className="truncate">{booking.customer_email}</span></span>
                            )}
                            {booking.customer_phone && (
                              <span className="flex items-center gap-1"><Phone className="h-3 w-3 shrink-0" /> {booking.customer_phone}</span>
                            )}
                          </div>
                          {booking.notes && (
                            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <FileText className="h-3 w-3 shrink-0" /> <span className="truncate">{booking.notes}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        {booking.status === "confirmed" && (
                          <>
                            <Button size="icon" variant="ghost" className="h-6 w-6 sm:h-7 sm:w-7" title="Complete"
                              onClick={() => updateBookingStatus(booking.id, "completed")}>
                              <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6 sm:h-7 sm:w-7" title="Cancel"
                              onClick={() => updateBookingStatus(booking.id, "cancelled")}>
                              <X className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-destructive" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6 sm:h-7 sm:w-7 hidden sm:flex" title="No Show"
                              onClick={() => updateBookingStatus(booking.id, "no_show")}>
                              <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
                            </Button>
                          </>
                        )}
                        <Button size="icon" variant="ghost" className="h-6 w-6 sm:h-7 sm:w-7" title="Delete"
                          onClick={() => deleteBooking(booking.id)}>
                          <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
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
