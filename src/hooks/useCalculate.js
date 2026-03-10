"use client";

import { useState, useCallback } from "react";
import { calc } from "../lib/taxEngine.js";

const API_BASE = "";

/**
 * Call server /api/v1/calculate; on failure fall back to client-side tax engine.
 * @param {string | null} sessionId - optional, for analytics
 * @param {string | null} visitorId - optional persistent visitor id
 * @returns {{ calculate: function(params): Promise<result>, isLoading: boolean, error: Error | null }}
 */
export function useCalculate(sessionId = null, visitorId = null) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const calculate = useCallback(
    async (params) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/v1/calculate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...params,
            sessionId: sessionId ?? undefined,
            visitorId: visitorId ?? undefined,
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        return {
          net: data.net,
          gross: data.gross,
          effectiveTaxRate: data.effectiveTaxRate,
          breakdown: data.breakdown,
          employerCost: data.employerCost ?? null,
          recommendedPartners: data.recommendedPartners ?? [],
          matchedPartner: data.matchedPartner ?? null,
          profileType: data.profileType ?? null,
          fromServer: true,
        };
      } catch (e) {
        setError(e);
        // Fallback: client-side tax engine (existing calc)
        const breakdown = calc(params);
        return {
          net: breakdown.nI,
          gross: breakdown.gT,
          effectiveTaxRate: breakdown.eR,
          breakdown,
          employerCost: null,
          recommendedPartners: [],
          matchedPartner: null,
          profileType: null,
          fromServer: false,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, visitorId]
  );

  return { calculate, isLoading, error };
}
