import { useImpersonation } from "@/hooks/useImpersonation";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Eye, ArrowLeft } from "lucide-react";
import { useEffect } from "react";

export default function ImpersonationBanner() {
  const { impersonatedUserId, impersonatedLabel, stopImpersonation } = useImpersonation();
  const { isSuperAdmin } = useSuperAdmin();
  const navigate = useNavigate();

  // Push page content down so the fixed banner doesn't cover the app header
  useEffect(() => {
    if (impersonatedUserId) {
      document.body.style.paddingTop = "44px";
    } else {
      document.body.style.paddingTop = "";
    }
    return () => {
      document.body.style.paddingTop = "";
    };
  }, [impersonatedUserId]);

  if (!impersonatedUserId) return null;
  // Hide banner for non-super-admins (defensive — they shouldn't have it set anyway)
  if (isSuperAdmin === false) {
    stopImpersonation();
    return null;
  }

  const exit = () => {
    stopImpersonation();
    navigate("/superadmin", { replace: true });
    // Reload to clear any cached state from the impersonated dashboard
    setTimeout(() => window.location.reload(), 50);
  };

  return (
    <div className="fixed top-0 inset-x-0 z-[100] bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-center gap-3 text-sm shadow-lg">
      <Eye className="h-4 w-4 shrink-0" />
      <span className="truncate">
        Viewing as <strong>{impersonatedLabel || "customer"}</strong>. Any changes affect their account.
      </span>
      <Button variant="secondary" size="sm" onClick={exit} className="h-7 ml-2 shrink-0">
        <ArrowLeft className="h-3 w-3 mr-1" /> Back to Super Admin
      </Button>
    </div>
  );
}
