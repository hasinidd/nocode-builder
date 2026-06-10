import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Phone, QrCode, Trash2, Loader2, RefreshCw, CheckCircle2, XCircle, Wifi, KeyRound, Link2, Facebook } from "lucide-react";
import QRCodeDisplay from "@/components/QRCodeDisplay";

declare global {
  interface Window {
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

interface WhatsAppSession {
  id: string;
  agent_id: string;
  session_name: string;
  phone_number: string;
  status: string;
  read_incoming_messages: boolean;
  created_at: string;
  wasender_session_id: number | null;
  provider?: string;
  meta_phone_number_id?: string | null;
}

export default function WhatsAppTab({ agentId }: { agentId: string }) {
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectingSessionId, setConnectingSessionId] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState(false);
  const [notifyBookings, setNotifyBookings] = useState(true);
  const [notifyOrders, setNotifyOrders] = useState(true);
  const [notifyInquiries, setNotifyInquiries] = useState(true);
  const [provider, setProvider] = useState<"wasender" | "meta">("meta");
  const [metaAppId, setMetaAppId] = useState("");
  const [metaAppSecret, setMetaAppSecret] = useState("");
  const [metaAccessToken, setMetaAccessToken] = useState("");
  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState("");
  const [metaBusinessAccountId, setMetaBusinessAccountId] = useState("");
  const [metaVerifyToken, setMetaVerifyToken] = useState("");
  const [embeddedSignupLoading, setEmbeddedSignupLoading] = useState(false);
  const metaSignupInfoRef = useRef<{ phone_number_id?: string; waba_id?: string; business_phone_number?: string }>({});
  const embeddedSignupResultRef = useRef<{
    resolve: (payload: Record<string, string>) => void;
    reject: (error: Error) => void;
  } | null>(null);

  const loadSessions = useCallback(async () => {
    const { data } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("agent_id", agentId);
    setSessions((data || []) as WhatsAppSession[]);
    setLoading(false);
  }, [agentId]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  useEffect(() => {
    if (document.getElementById("facebook-jssdk")) return;
    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        if (event.origin === window.location.origin && event.data?.type === "META_EMBEDDED_SIGNUP_CODE") {
          const payload = event.data.payload;
          if (payload?.error) {
            embeddedSignupResultRef.current?.reject(new Error(payload.error_description || payload.error || "Meta signup was cancelled"));
          } else if (payload?.code) {
            embeddedSignupResultRef.current?.resolve(payload);
          }
          embeddedSignupResultRef.current = null;
          return;
        }

        if (!event.origin.endsWith("facebook.com")) return;
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.type !== "WA_EMBEDDED_SIGNUP") return;
        const info = data?.data || {};
        if (info.phone_number_id || info.waba_id || info.whatsapp_business_account_id) {
          metaSignupInfoRef.current = {
            phone_number_id: info.phone_number_id,
            waba_id: info.waba_id || info.whatsapp_business_account_id,
            business_phone_number: info.business_phone_number,
          };
        }
      } catch {
        // ignore non-JSON Meta messages
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Load notification preferences
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("agents")
        .select("notify_bookings, notify_orders, notify_inquiries")
        .eq("id", agentId)
        .single();
      if (data) {
        setNotifyBookings(data.notify_bookings ?? true);
        setNotifyOrders(data.notify_orders ?? true);
        setNotifyInquiries(data.notify_inquiries ?? true);
      }
    })();
  }, [agentId]);

  const updateNotifyPref = async (field: string, value: boolean) => {
    if (field === "notify_bookings") setNotifyBookings(value);
    if (field === "notify_orders") setNotifyOrders(value);
    if (field === "notify_inquiries") setNotifyInquiries(value);
    const { error } = await supabase.from("agents").update({ [field]: value } as any).eq("id", agentId);
    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    }
  };

  const createSession = async () => {
    if (!sessionName.trim() || !phoneNumber.trim()) {
      toast({ title: "Missing fields", description: "Please enter session name and phone number.", variant: "destructive" });
      return;
    }
    if (provider === "meta" && (!metaAppId.trim() || !metaAppSecret.trim() || !metaAccessToken.trim() || !metaPhoneNumberId.trim() || !metaVerifyToken.trim())) {
      toast({ title: "Missing Meta details", description: "Access token, phone number ID, and verify token are required.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const action = provider === "meta" ? "create_meta_session" : "create_session";
      const res = await supabase.functions.invoke("whatsapp-manage", {
        body: {
          action,
          agent_id: agentId,
          session_name: sessionName.trim(),
          phone_number: phoneNumber.trim(),
          meta_app_id: metaAppId.trim(),
          meta_app_secret: metaAppSecret.trim(),
          meta_access_token: metaAccessToken.trim(),
          meta_phone_number_id: metaPhoneNumberId.trim(),
          meta_business_account_id: metaBusinessAccountId.trim() || null,
          meta_verify_token: metaVerifyToken.trim(),
        },
      });
      if (res.error || !res.data?.success) throw new Error(res.data?.error || "Failed to create session");
      toast({
        title: "Session created!",
        description: provider === "meta"
          ? (res.data.webhook_configured ? "Meta webhook configured automatically." : `Saved, but Meta webhook needs manual setup: ${res.data.webhook_warning || "permission denied"}`)
          : "Now connect to generate a QR code.",
      });
      setSessionName("");
      setPhoneNumber("");
      setMetaAppId("");
      setMetaAppSecret("");
      setMetaAccessToken("");
      setMetaPhoneNumberId("");
      setMetaBusinessAccountId("");
      setMetaVerifyToken("");
      await loadSessions();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const startMetaEmbeddedSignup = async () => {
    if (!sessionName.trim()) {
      toast({ title: "Session name required", description: "Add a name before starting Meta signup.", variant: "destructive" });
      return;
    }

    const hostname = window.location.hostname;
    const isPreview = hostname.includes("id-preview--");
    if (isPreview) {
      toast({
        title: "Open the published site",
        description: "Facebook signup only works from the Meta-approved domain, such as buildstart.io.",
        variant: "destructive",
      });
      return;
    }

    setEmbeddedSignupLoading(true);
    try {
      const configRes = await supabase.functions.invoke("whatsapp-manage", { body: { action: "get_meta_config" } });
      if (configRes.error || !configRes.data?.success) throw new Error(configRes.data?.error || "Meta signup is not configured");

      await new Promise<void>((resolve, reject) => {
        const started = Date.now();
        const wait = window.setInterval(() => {
          if (window.FB) {
            window.clearInterval(wait);
            resolve();
          } else if (Date.now() - started > 8000) {
            window.clearInterval(wait);
            reject(new Error("Meta login could not load"));
          }
        }, 100);
      });

      const redirectUri = `${window.location.origin}/auth/facebook`;

      window.FB.init({ appId: configRes.data.app_id, cookie: true, xfbml: false, version: "v21.0" });

      const signupPayload = await new Promise<Record<string, string>>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          if (embeddedSignupResultRef.current) {
            embeddedSignupResultRef.current = null;
            reject(new Error("Meta signup timed out before returning an authorization code"));
          }
        }, 120000);

        embeddedSignupResultRef.current = {
          resolve: (payload) => {
            window.clearTimeout(timeout);
            resolve(payload);
          },
          reject: (error) => {
            window.clearTimeout(timeout);
            reject(error);
          },
        };

        window.FB.login((response: any) => {
          if (response?.authResponse?.code) {
            embeddedSignupResultRef.current?.resolve(response.authResponse);
            embeddedSignupResultRef.current = null;
            return;
          }

          if (response?.status === "not_authorized") {
            embeddedSignupResultRef.current?.reject(new Error("Meta signup was not authorized"));
            embeddedSignupResultRef.current = null;
          }
        }, {
          config_id: configRes.data.config_id,
          redirect_uri: redirectUri,
          response_type: "code",
          override_default_response_type: true,
          extras: { version: "v3", setup: {} },
        });
      });

      const signup = signupPayload;
      try {
        const signupInfo = metaSignupInfoRef.current;
        if (!signup.phone_number_id && !signupInfo.phone_number_id) throw new Error("Meta did not return a phone number ID");
        if (!signup.whatsapp_business_account_id && !signup.waba_id && !signupInfo.waba_id) throw new Error("Meta did not return a WhatsApp Business Account ID");
        const res = await supabase.functions.invoke("whatsapp-manage", {
          body: {
            action: "complete_meta_embedded_signup",
            agent_id: agentId,
            session_name: sessionName.trim(),
            code: signup.code,
            redirect_uri: redirectUri,
            phone_number_id: signup.phone_number_id || signupInfo.phone_number_id,
            waba_id: signup.whatsapp_business_account_id || signup.waba_id || signupInfo.waba_id,
            business_phone_number: signup.business_phone_number || signupInfo.business_phone_number,
          },
        });
        if (res.error || !res.data?.success) throw new Error(res.data?.error || "Could not connect Meta WhatsApp");
        toast({ title: "Meta WhatsApp connected", description: res.data.webhook_configured ? "Webhook subscription is active." : `Connected, but webhook may need review: ${res.data.webhook_warning || "permission required"}` });
        setSessionName("");
        await loadSessions();
      } catch (err: any) {
        toast({ title: "Meta signup failed", description: err.message, variant: "destructive" });
      } finally {
        setEmbeddedSignupLoading(false);
      }
    } catch (err: any) {
      embeddedSignupResultRef.current = null;
      setEmbeddedSignupLoading(false);
      toast({ title: "Meta signup unavailable", description: err.message, variant: "destructive" });
    }
  };

  const connectSession = async (sessionId: string) => {
    setConnectingSessionId(sessionId);
    setQrCode(null);
    try {
      const res = await supabase.functions.invoke("whatsapp-manage", {
        body: { action: "connect_session", session_id: sessionId },
      });
      if (res.error || !res.data?.success) throw new Error(res.data?.error || "Failed to connect");

      if (res.data.status === "NEED_SCAN") {
        if (res.data.qrCode) {
          setQrCode(res.data.qrCode);
          toast({ title: "QR Code Ready", description: "Scan the QR code with your WhatsApp app." });
        } else {
          toast({ title: "Waiting for QR", description: "Click 'Refresh QR' to get the QR code." });
        }
        startPolling(sessionId);
        await loadSessions();
      } else if (res.data.status === "CONNECTED") {
        toast({ title: "Connected!", description: "WhatsApp session is already connected." });
        await loadSessions();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setConnectingSessionId(null);
    }
  };

  const startPolling = (sessionId: string) => {
    setPollingStatus(true);
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await supabase.functions.invoke("whatsapp-manage", {
          body: { action: "get_status", session_id: sessionId },
        });
        if (res.data?.status === "connected") {
          clearInterval(interval);
          setPollingStatus(false);
          setQrCode(null);
          toast({ title: "Connected!", description: "WhatsApp is now connected to your bot." });
          await loadSessions();
        }
      } catch {}
      if (attempts > 30) {
        clearInterval(interval);
        setPollingStatus(false);
      }
    }, 5000);
  };

  const refreshQR = async (sessionId: string) => {
    try {
      const res = await supabase.functions.invoke("whatsapp-manage", {
        body: { action: "get_qr", session_id: sessionId },
      });
      if (res.data?.qrCode) {
        setQrCode(res.data.qrCode);
      } else {
        toast({ title: "Could not refresh QR", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this WhatsApp session?")) return;
    try {
      const res = await supabase.functions.invoke("whatsapp-manage", {
        body: { action: "delete_session", session_id: sessionId },
      });
      if (res.error || !res.data?.success) throw new Error(res.data?.error || "Failed to delete");
      toast({ title: "Session deleted" });
      setQrCode(null);
      await loadSessions();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const toggleRead = async (sessionId: string, currentValue: boolean) => {
    try {
      const res = await supabase.functions.invoke("whatsapp-manage", {
        body: { action: "toggle_read", session_id: sessionId, read_incoming_messages: !currentValue },
      });
      if (res.error || !res.data?.success) throw new Error(res.data?.error || "Failed to update");
      toast({ title: !currentValue ? "Messages will be marked as read" : "Messages will stay unread" });
      await loadSessions();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const checkStatus = async (sessionId: string) => {
    try {
      const res = await supabase.functions.invoke("whatsapp-manage", {
        body: { action: "get_status", session_id: sessionId },
      });
      toast({ title: `Status: ${res.data?.status || "unknown"}` });
      await loadSessions();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading WhatsApp...</div>;
  }

  const activeSession = sessions[0];
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Connected</Badge>;
      case "qr_ready":
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200"><QrCode className="h-3 w-3 mr-1" />Waiting for scan</Badge>;
      case "disconnected":
        return <Badge className="bg-red-100 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Disconnected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">WhatsApp</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Connect your bot to WhatsApp to handle customer messages automatically.</p>
      </div>

      {!activeSession ? (
        /* Connect Flow */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Phone className="h-5 w-5" />Connect WhatsApp</CardTitle>
            <CardDescription>Give this session a name, then scan the QR with your phone.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="session-name">Session Name</Label>
              <Input
                id="session-name"
                placeholder="e.g. My Business WhatsApp"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
              />
            </div>
            <Button
              onClick={async () => {
                if (!sessionName.trim()) {
                  toast({ title: "Session name required", variant: "destructive" });
                  return;
                }
                setCreating(true);
                try {
                  const res = await supabase.functions.invoke("whatsapp-manage", {
                    body: { action: "create_session", provider: "waha", agent_id: agentId, session_name: sessionName.trim() },
                  });
                  if (res.error || !res.data?.success) throw new Error(res.data?.error || "Failed to create session");
                  toast({ title: "Session created", description: "Now generate a QR code." });
                  setSessionName("");
                  await loadSessions();
                } catch (err: any) {
                  toast({ title: "Error", description: err.message, variant: "destructive" });
                } finally {
                  setCreating(false);
                }
              }}
              disabled={creating}
              className="w-full"
            >
              {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : <><Phone className="h-4 w-4 mr-2" />Connect WhatsApp</>}
            </Button>
          </CardContent>
        </Card>

      ) : (
        /* Session Management */
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    {activeSession.session_name}
                  </CardTitle>
                  <CardDescription className="mt-1">{activeSession.phone_number}</CardDescription>
                  {activeSession.provider === "meta" && <Badge variant="secondary" className="mt-2">Meta Cloud API</Badge>}
                </div>
                {getStatusBadge(activeSession.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* QR Code area */}
              {activeSession.provider === "meta" && (
                <div className="space-y-2 rounded-md border bg-muted/20 p-4 text-sm">
                  <div className="flex items-center gap-2 font-medium"><KeyRound className="h-4 w-4" />Meta webhook setup</div>
                  <p className="text-muted-foreground">Use this callback URL in your Meta app webhook and subscribe to WhatsApp messages.</p>
                  <code className="block break-all text-xs text-muted-foreground">{webhookUrl}</code>
                </div>
              )}

              {activeSession.provider !== "meta" && (activeSession.status === "pending" || activeSession.status === "qr_ready" || activeSession.status === "disconnected") && (
                <div className="space-y-3">
                  {qrCode ? (
                    <div className="flex flex-col items-center gap-3 p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm font-medium">Scan this QR code with WhatsApp</p>
                      <QRCodeDisplay value={qrCode} />
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => refreshQR(activeSession.id)}>
                          <RefreshCw className="h-3 w-3 mr-1" />Refresh QR
                        </Button>
                      </div>
                      {pollingStatus && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />Waiting for connection...
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button onClick={() => connectSession(activeSession.id)} disabled={!!connectingSessionId}>
                        {connectingSessionId ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Connecting...</> : <><QrCode className="h-4 w-4 mr-2" />Generate QR Code</>}
                      </Button>
                      {activeSession.status === "qr_ready" && (
                        <Button variant="outline" onClick={() => refreshQR(activeSession.id)}>
                          <RefreshCw className="h-4 w-4 mr-2" />Refresh QR
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeSession.status === "connected" && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <Wifi className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700 dark:text-green-400">WhatsApp is connected and receiving messages.</span>
                </div>
              )}

              <Separator />

              {/* Owner Notification Preferences */}
              <div className="space-y-3">
                <p className="text-sm font-semibold">Owner Notifications</p>
                <p className="text-xs text-muted-foreground">Receive WhatsApp messages when customers take actions.</p>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">New Bookings</p>
                    <p className="text-xs text-muted-foreground">Get notified when a booking is placed</p>
                  </div>
                  <Switch
                    checked={notifyBookings}
                    onCheckedChange={(v) => updateNotifyPref("notify_bookings", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">New Orders</p>
                    <p className="text-xs text-muted-foreground">Get notified when an order is created</p>
                  </div>
                  <Switch
                    checked={notifyOrders}
                    onCheckedChange={(v) => updateNotifyPref("notify_orders", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">New Inquiries</p>
                    <p className="text-xs text-muted-foreground">Get notified when customer info is collected</p>
                  </div>
                  <Switch
                    checked={notifyInquiries}
                    onCheckedChange={(v) => updateNotifyPref("notify_inquiries", v)}
                  />
                </div>
              </div>

              <Separator />

              {/* Message Control */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Read Incoming Messages</p>
                  <p className="text-xs text-muted-foreground">
                    {activeSession.read_incoming_messages
                      ? "Messages are marked as read (blue ticks)"
                      : "Messages stay unread (grey ticks)"}
                  </p>
                </div>
                <Switch
                  checked={activeSession.read_incoming_messages}
                  onCheckedChange={() => toggleRead(activeSession.id, activeSession.read_incoming_messages)}
                />
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => checkStatus(activeSession.id)}>
                  <RefreshCw className="h-3 w-3 mr-1" />Check Status
                </Button>
                <Button variant="destructive" size="sm" onClick={() => deleteSession(activeSession.id)}>
                  <Trash2 className="h-3 w-3 mr-1" />Delete Session
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
