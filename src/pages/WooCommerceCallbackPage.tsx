import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

type CallbackStatus = "loading" | "success" | "error";

export default function WooCommerceCallbackPage() {
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [message, setMessage] = useState("Finalizing WooCommerce connection...");
  const navigate = useNavigate();

  const params = useMemo(() => new URLSearchParams(window.location.search), []);

  useEffect(() => {
    const agentId = params.get("agent_id");

    if (!agentId) {
      setStatus("error");
      setMessage("Missing WooCommerce callback parameters.");
      return;
    }

    let attempts = 0;
    const maxAttempts = 40;

    const pollForConnection = async () => {
      attempts += 1;

      try {
        const { data, error } = await supabase
          .from("woocommerce_connections" as any)
          .select("store_url, consumer_key")
          .eq("agent_id", agentId)
          .maybeSingle();

        if (error) throw error;

        const connection = data as { store_url?: string | null; consumer_key?: string | null } | null;
        if (connection?.consumer_key && connection.consumer_key !== "pending_oauth") {
          setStatus("success");
          setMessage(`Store ${connection.store_url || "WooCommerce"} connected successfully.`);
          window.setTimeout(() => navigate("/integrations"), 1500);
          return;
        }

        if (attempts >= maxAttempts) {
          setStatus("error");
          setMessage("WooCommerce approved the connection, but the API keys have not arrived yet. Please go back and try again.");
          return;
        }

        window.setTimeout(pollForConnection, 1500);
      } catch (err: any) {
        setStatus("error");
        setMessage(err?.message || "Unable to complete WooCommerce connection.");
      }
    };

    pollForConnection();
  }, [params]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md border-border/50">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            {status === "loading" && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
            {status === "success" && <CheckCircle2 className="h-6 w-6 text-primary" />}
            {status === "error" && <AlertTriangle className="h-6 w-6 text-destructive" />}
          </div>
          <CardTitle>
            {status === "loading" && "Connecting WooCommerce"}
            {status === "success" && "WooCommerce connected"}
            {status === "error" && "Connection failed"}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button variant="outline" onClick={() => navigate("/integrations")}>
            Back to Integrations
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
