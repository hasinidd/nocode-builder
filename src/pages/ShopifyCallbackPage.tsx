import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

type CallbackStatus = "loading" | "success" | "error";

export default function ShopifyCallbackPage() {
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [message, setMessage] = useState("Finalizing Shopify connection...");
  const navigate = useNavigate();

  const params = useMemo(() => new URLSearchParams(window.location.search), []);

  useEffect(() => {
    const finalizeConnection = async () => {
      const errorParam = params.get("error");
      const errorDescription = params.get("error_description");

      if (errorParam) {
        setStatus("error");
        setMessage(errorDescription || errorParam || "Shopify authorization was cancelled.");
        return;
      }

      const payload = Object.fromEntries(params.entries());
      if (!payload.code || !payload.shop || !payload.state) {
        setStatus("error");
        setMessage("Missing Shopify callback parameters.");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("shopify-callback", {
          body: { params: payload },
        });

        if (error) throw error;
        if (!data?.success) {
          throw new Error(data?.error || "Unable to complete Shopify connection.");
        }

        setStatus("success");
        setMessage(`Store ${data.shop || payload.shop} connected successfully.`);
        window.setTimeout(() => navigate("/integrations"), 1500);
      } catch (err: any) {
        setStatus("error");
        setMessage(err?.message || "Unable to complete Shopify connection.");
      }
    };

    finalizeConnection();
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
            {status === "loading" && "Connecting Shopify"}
            {status === "success" && "Shopify connected"}
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
