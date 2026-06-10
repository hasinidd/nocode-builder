import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function StripeCallbackPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const accountId = searchParams.get("account_id");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      if (error === "refresh") {
        setStatus("error");
        setMessage("The onboarding link expired. Please try connecting again.");
      } else {
        setStatus("error");
        setMessage(searchParams.get("error_description") || "Authorization was denied");
      }
      return;
    }

    if (!accountId || !state) {
      setStatus("error");
      setMessage("Missing account ID or state");
      return;
    }

    const verifyAccount = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "stripe-connect-callback",
          { body: { account_id: accountId, state } },
        );

        if (fnError || data?.error) {
          throw new Error(data?.error || fnError?.message || "Failed to verify");
        }

        if (data.is_complete) {
          setStatus("success");
          setMessage(`Stripe account ${data.stripe_account_id} connected successfully!`);
        } else {
          setStatus("error");
          setMessage("Stripe onboarding is not yet complete. Please finish the setup in Stripe and try again.");
        }

        if (data.is_complete) {
          setTimeout(() => navigate("/integrations"), 2000);
        }
      } catch (err: any) {
        setStatus("error");
        setMessage(err.message || "Failed to connect Stripe account");
      }
    };

    verifyAccount();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-4 max-w-md">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Verifying your Stripe account...</h2>
            <p className="text-muted-foreground">Please wait while we confirm your setup.</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="h-12 w-12 text-primary mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Stripe Connected!</h2>
            <p className="text-muted-foreground">{message}</p>
            <p className="text-sm text-muted-foreground">Redirecting to integrations...</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Connection Issue</h2>
            <p className="text-muted-foreground">{message}</p>
            <button
              onClick={() => navigate("/integrations")}
              className="text-sm text-primary hover:underline"
            >
              Back to Integrations
            </button>
          </>
        )}
      </div>
    </div>
  );
}
