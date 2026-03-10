"use client";

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useSession } from "@/hooks/useSession";
import { useEventLogger } from "@/hooks/useEventLogger";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "lib/supabase/client";

export interface TenantConfig {
  tenant?: { id: string; name: string; slug: string };
  customConfig?: { extraBenefits?: string[] };
  [key: string]: unknown;
}

interface SessionContextValue {
  sessionId: string | null;
  visitorId: string | null;
  supabaseUserId: string | null;
  logEvent: (type: string, data?: Record<string, unknown>) => void;
  tenant: TenantConfig | null;
  isSessionLoading: boolean;
}

const SessionContext = createContext<SessionContextValue>({
  sessionId: null,
  visitorId: null,
  supabaseUserId: null,
  logEvent: () => {},
  tenant: null,
  isSessionLoading: true,
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<{ id: string; email?: string | null } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        setAuthUser({ id: session.user.id, email: session.user.email ?? null });
      } else {
        setAuthUser(null);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id) {
        setAuthUser({ id: session.user.id, email: session.user.email ?? null });
      } else {
        setAuthUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const { sessionId, visitorId, isLoading: isSessionLoading } = useSession({
    supabaseUserId: authUser?.id ?? null,
    email: authUser?.email ?? null,
  });

  const logEvent = useEventLogger(sessionId, visitorId);
  const { data: tenantData } = useTenant();

  const logEventStable = useCallback(
    (type: string, data?: Record<string, unknown>) => {
      (logEvent as (t: string, p?: Record<string, unknown>) => void)(type, data ?? {});
    },
    [logEvent]
  );

  const tenant: TenantConfig | null = (tenantData ?? null) as TenantConfig | null;

  const value = useMemo<SessionContextValue>(
    () => ({
      sessionId,
      visitorId,
      supabaseUserId: authUser?.id ?? null,
      logEvent: logEventStable,
      tenant,
      isSessionLoading,
    }),
    [sessionId, visitorId, authUser?.id, logEventStable, tenant, isSessionLoading]
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSessionContext must be used within SessionProvider");
  }
  return ctx;
}
