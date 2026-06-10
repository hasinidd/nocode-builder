import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Save, CreditCard, RefreshCw, Calendar, Link2, Unlink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [reconfiguring, setReconfiguring] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [calendarConnection, setCalendarConnection] = useState<any>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadCalendarConnection();
    } else {
      setPageLoading(false);
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      if (data) setDisplayName(data.display_name || "");
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setPageLoading(false);
    }
  };

  const loadCalendarConnection = async () => {
    try {
      const { data } = await supabase
        .from("google_calendar_connections" as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      setCalendarConnection(data);
    } catch (err) {
      console.error("Failed to load calendar connection:", err);
    }
  };

  const connectGoogleCalendar = async () => {
    setCalendarLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-calendar-auth-url", {
        body: { user_id: user!.id },
      });
      if (error || !data?.auth_url) {
        toast({ title: "Error", description: "Failed to get authorization URL", variant: "destructive" });
        return;
      }

      window.location.href = data.auth_url;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCalendarLoading(false);
    }
  };

  const disconnectGoogleCalendar = async () => {
    setCalendarLoading(true);
    try {
      await supabase
        .from("google_calendar_connections" as any)
        .delete()
        .eq("user_id", user!.id);
      setCalendarConnection(null);
      toast({ title: "Google Calendar disconnected" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCalendarLoading(false);
    }
  };

  if (pageLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Loading...</div>;
  }

  const saveProfile = async () => {
    setLoading(true);
    try {
      await supabase.from("profiles").update({ display_name: displayName }).eq("user_id", user!.id);
      toast({ title: "Profile updated!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 glass">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <h1 className="font-display text-3xl font-bold">Settings</h1>

        <Card className="glass border-border/50 card-shadow">
          <CardHeader>
            <CardTitle className="font-display">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <Button onClick={saveProfile} disabled={loading} className="bg-primary hover:bg-primary/90 gap-2">
              <Save className="h-4 w-4" /> Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Billing shortcut removed - use Billing tab in sidebar */}

        <Card className="glass border-border/50 card-shadow">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Calendar className="h-5 w-5" /> Google Calendar Integration
            </CardTitle>
            <CardDescription>
              Connect your Google Calendar to automatically create events when bookings are placed. Customers will receive email invitations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {calendarConnection ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <Link2 className="h-4 w-4 text-primary" />
                  <span className="text-sm text-foreground">
                    Connected to <strong>{calendarConnection.google_email}</strong>
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnectGoogleCalendar}
                  disabled={calendarLoading}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <Unlink className="h-4 w-4" /> Disconnect
                </Button>
              </div>
            ) : (
              <Button onClick={connectGoogleCalendar} className="gap-2">
                <Calendar className="h-4 w-4" /> Connect Google Calendar
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="glass border-border/50 card-shadow border-destructive/30">
          <CardHeader>
            <CardTitle className="font-display text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
              <div className="space-y-1">
                <p className="font-medium text-sm">Reconfigure Bot</p>
                <p className="text-xs text-muted-foreground">
                  Delete your current bot configuration (products, FAQs, services, etc.) and start fresh. Chat history and billing stats will be preserved.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-2 shrink-0 ml-4">
                    <RefreshCw className="h-4 w-4" /> Reconfigure
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete your bot configuration including all products, services, FAQs, bookings, orders, WhatsApp sessions, and availability settings. 
                      <br /><br />
                      <strong>Chat history and billing statistics will be preserved.</strong>
                      <br /><br />
                      You will be redirected to set up a new bot from scratch.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={reconfiguring}
                      onClick={async (e) => {
                        e.preventDefault();
                        setReconfiguring(true);
                        try {
                          const { error } = await supabase.functions.invoke("reconfigure-agent");
                          if (error) throw error;
                          toast({ title: "Bot reset successfully", description: "Redirecting to setup..." });
                          navigate("/agents/new", { replace: true });
                        } catch (err: any) {
                          toast({ title: "Error", description: err.message, variant: "destructive" });
                        } finally {
                          setReconfiguring(false);
                        }
                      }}
                    >
                      {reconfiguring ? "Deleting..." : "Yes, reconfigure"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-border/50">
              <div className="space-y-1">
                <p className="font-medium text-sm">Sign Out</p>
                <p className="text-xs text-muted-foreground">Sign out of your account.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { signOut(); navigate("/"); }}
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
