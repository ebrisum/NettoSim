"use client";

import { useState, useEffect, useCallback } from "react";
import { getOrCreateVisitorId } from "@/lib/visitorId";

const API_BASE = "";

/**
 * Get or create a session ID and persistent visitor ID.
 * @returns {{ sessionId: string | null, visitorId: string | null, isLoading: boolean, refetch: function }}
 */
export function useSession(options = {}) {
  const {
    fingerprint = null,
    referrer = null,
    supabaseUserId = null,
    email = null,
  } = options;

  const [sessionId, setSessionId] = useState(null);
  const [visitorId, setVisitorId] = useState(() => getOrCreateVisitorId());
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    const ensuredVisitorId = visitorId || getOrCreateVisitorId();
    if (!visitorId && ensuredVisitorId) setVisitorId(ensuredVisitorId);

    try {
      const res = await fetch(`${API_BASE}/api/v1/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fingerprint: fingerprint || undefined,
          referrer:
            referrer ??
            (typeof document !== "undefined" ? document.referrer || null : null),
          visitorId: ensuredVisitorId || undefined,
          supabaseUserId: supabaseUserId || undefined,
          email: email || undefined,
        }),
      });
      if (!res.ok) throw new Error("Session failed");
      const data = await res.json();
      setSessionId(data.sessionId ?? null);
      if (typeof data.visitorId === "string") setVisitorId(data.visitorId);
      return data.sessionId;
    } catch {
      setSessionId(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fingerprint, referrer, supabaseUserId, email, visitorId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { sessionId, visitorId, isLoading, refetch };
}
