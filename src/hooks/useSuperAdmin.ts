import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useSuperAdmin() {
  const { loading: authLoading } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (authLoading) {
      setLoading(true);
      return;
    }

    setLoading(true);

    const check = async () => {
      try {
        // IMPORTANT: use real session user id, not impersonated user id
        const { data: sessionData } = await supabase.auth.getSession();
        const realUserId = sessionData?.session?.user?.id;
        if (!realUserId) {
          if (!cancelled) {
            setIsSuperAdmin(null);
            setLoading(false);
          }
          return;
        }

        let result = false;

        for (let attempt = 0; attempt < 3; attempt += 1) {
          const { data, error } = await supabase.rpc("has_role", {
            _user_id: realUserId,
            _role: "super_admin",
          });

          if (!error) {
            result = !!data;
            break;
          }

          if (attempt === 2) {
            throw error;
          }

          await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
        }

        if (!cancelled) setIsSuperAdmin(result);
      } catch (error) {
        console.error("Failed to verify super admin role:", error);
        if (!cancelled) setIsSuperAdmin(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    check();

    return () => {
      cancelled = true;
    };
  }, [authLoading]);

  return { isSuperAdmin, loading };
}

export function usePlatformStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("get_platform_stats");
      if (error) throw error;
      setStats(data);
    } catch (e) {
      console.error("Failed to fetch platform stats:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { stats, loading, refetch: fetch };
}

export function useAllCustomers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("get_all_customers");
      if (error) throw error;
      setCustomers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch customers:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { customers, loading, refetch: fetch };
}

export function useCustomerDetail(customerId: string | null) {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!customerId) { setDetail(null); return; }
    setLoading(true);
    const fetch = async () => {
      try {
        const { data, error } = await supabase.rpc("get_customer_detail", {
          _customer_id: customerId,
        });
        if (error) throw error;
        setDetail(data);
      } catch (e) {
        console.error("Failed to fetch customer detail:", e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [customerId]);

  return { detail, loading };
}
