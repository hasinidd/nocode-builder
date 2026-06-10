import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "impersonate_user_id";
const STORAGE_KEY_LABEL = "impersonate_user_label";

interface ImpersonationContextType {
  impersonatedUserId: string | null;
  impersonatedLabel: string | null;
  startImpersonation: (userId: string, label?: string) => void;
  stopImpersonation: () => void;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  });
  const [impersonatedLabel, setImpersonatedLabel] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY_LABEL); } catch { return null; }
  });

  // Sync across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setImpersonatedUserId(e.newValue);
      if (e.key === STORAGE_KEY_LABEL) setImpersonatedLabel(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const startImpersonation = useCallback((userId: string, label?: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, userId);
      if (label) localStorage.setItem(STORAGE_KEY_LABEL, label);
    } catch {}
    setImpersonatedUserId(userId);
    setImpersonatedLabel(label || null);
  }, []);

  const stopImpersonation = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY_LABEL);
    } catch {}
    setImpersonatedUserId(null);
    setImpersonatedLabel(null);
  }, []);

  return (
    <ImpersonationContext.Provider value={{ impersonatedUserId, impersonatedLabel, startImpersonation, stopImpersonation }}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const ctx = useContext(ImpersonationContext);
  if (!ctx) throw new Error("useImpersonation must be used within ImpersonationProvider");
  return ctx;
}
