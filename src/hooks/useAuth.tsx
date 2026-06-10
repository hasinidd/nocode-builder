import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { useImpersonation } from "@/hooks/useImpersonation";

export interface StripeInvoice {
  id: string;
  number: string | null;
  amount: number;
  currency: string;
  status: string;
  created: number;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
}

interface SubscriptionInfo {
  subscribed: boolean;
  productId: string | null;
  priceId: string | null;
  subscriptionEnd: string | null;
  invoices: StripeInvoice[];
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  subscription: SubscriptionInfo;
  checkSubscription: () => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { impersonatedUserId } = useImpersonation();
  const [realUser, setRealUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionInfo>({
    subscribed: false,
    productId: null,
    priceId: null,
    subscriptionEnd: null,
    invoices: [],
  });

  const checkSubscription = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) return;
      if (sessionData.session.user.is_anonymous || !sessionData.session.user.email) {
        setSubscription({ subscribed: false, productId: null, priceId: null, subscriptionEnd: null, invoices: [] });
        return;
      }

      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      setSubscription({
        subscribed: data?.subscribed ?? false,
        productId: data?.product_id ?? null,
        priceId: data?.price_id ?? null,
        subscriptionEnd: data?.subscription_end ?? null,
        invoices: data?.invoices ?? [],
      });
    } catch (err) {
      console.error("Subscription check failed:", err);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setRealUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        setTimeout(() => checkSubscription(), 0);
      } else {
        setSubscription({ subscribed: false, productId: null, priceId: null, subscriptionEnd: null, invoices: [] });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setRealUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) checkSubscription();
    });

    return () => authSub.unsubscribe();
  }, [checkSubscription]);

  // Override id when impersonating
  const user = useMemo<User | null>(() => {
    if (!realUser) return null;
    if (impersonatedUserId && impersonatedUserId !== realUser.id) {
      return { ...realUser, id: impersonatedUserId } as User;
    }
    return realUser;
  }, [realUser, impersonatedUserId]);

  // Auto-refresh subscription every 60s
  useEffect(() => {
    if (!realUser) return;
    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [realUser, checkSubscription]);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
    setTimeout(async () => {
      try {
        const { logActivity } = await import("@/lib/activityLog");
        logActivity({ action: "signup", metadata: { email } });
      } catch {}
    }, 1000);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setTimeout(async () => {
      try {
        const { logActivity } = await import("@/lib/activityLog");
        logActivity({ action: "login", metadata: { email } });
      } catch {}
    }, 500);
  };

  const signOut = async () => {
    try {
      const { logActivity } = await import("@/lib/activityLog");
      await logActivity({ action: "logout" });
    } catch {}
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, subscription, checkSubscription, signUp, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
