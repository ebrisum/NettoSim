"use client";

import { useCallback } from "react";

const API_BASE = "";

/**
 * Log events (non-blocking). No-op if sessionId is null.
 * @param {string | null} sessionId
 * @param {string | null} visitorId
 * @returns {function(type: string, payload?: object)}
 */
export function useEventLogger(sessionId, visitorId = null) {
  const log = useCallback(
    (type, payload) => {
      if (!sessionId) return;
      fetch(`${API_BASE}/api/v1/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, visitorId: visitorId ?? undefined, type, payload }),
      }).catch(() => {});
    },
    [sessionId, visitorId]
  );
  return log;
}
