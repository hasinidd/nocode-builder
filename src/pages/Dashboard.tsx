import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useImpersonation } from "@/hooks/useImpersonation";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, loading: roleLoading } = useSuperAdmin();
  const { impersonatedUserId } = useImpersonation();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading || roleLoading || (user && isSuperAdmin === null)) {
      setChecking(true);
      return;
    }

    if (!user) {
      setChecking(false);
      return;
    }

    // Only auto-redirect super admin to superadmin when NOT impersonating
    if (isSuperAdmin && !impersonatedUserId) {
      navigate("/superadmin", { replace: true });
      return;
    }
    
    const checkAgent = async () => {
      const { data } = await supabase
        .from("agents")
        .select("id, status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const agent = data[0];
        if (agent.status === "draft") {
          navigate("/setup", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      } else {
        navigate("/setup", { replace: true });
      }
      setChecking(false);
    };

    checkAgent();
  }, [user, navigate, authLoading, roleLoading, isSuperAdmin, impersonatedUserId]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Loading...
      </div>
    );
  }

  return null;
}
