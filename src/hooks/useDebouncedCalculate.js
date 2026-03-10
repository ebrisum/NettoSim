"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSessionContext } from "@/components/providers/SessionProvider";
import { useCalculate } from "./useCalculate";

const DEBOUNCE_MS = 300;

/**
 * Converts form params to API shape (same keys; API strips unknown).
 */
function toApiParams(p) {
  return {
    employment: p.employment ?? 0,
    zzpIncome: p.zzpIncome ?? 0,
    hasPartner: !!p.hasPartner,
    inc2: p.inc2 ?? 0,
    pensioenPerc: p.pensioenPerc ?? 5,
    isAOW: !!p.isAOW,
    hasKids: !!p.hasKids,
    nKids: p.nKids ?? 0,
    kidsU12: p.kidsU12 ?? 0,
    nKidsOpvang: p.nKidsOpvang ?? 0,
    kotUur: p.kotUur ?? 9.5,
    kotUren: p.kotUren ?? 100,
    isRenter: !!p.isRenter,
    rent: p.rent ?? 0,
    hasHome: !!p.hasHome,
    hypotheek: p.hypotheek ?? 0,
    rentePerc: p.rentePerc ?? 3.8,
    wozWaarde: p.wozWaarde ?? 0,
    isStarter: !!p.isStarter,
    urenOK: !!p.urenOK,
    duoSchuld: p.duoSchuld ?? 0,
    box2Income: p.box2Income ?? 0,
    box3Spaargeld: p.box3Spaargeld ?? 0,
    box3Beleggingen: p.box3Beleggingen ?? 0,
    box3Schulden: p.box3Schulden ?? 0,
    wwwiaIncome: p.wwwiaIncome ?? 0,
    hasVolWW: !!p.hasVolWW,
    hasVolWIA: !!p.hasVolWIA,
    alimentatieBetaald: p.alimentatieBetaald ?? 0,
    alimentatieOntvangen: p.alimentatieOntvangen ?? 0,
    lijfrentePremie: p.lijfrentePremie ?? 0,
    provincie: p.provincie ?? "Onbekend",
    gemCategorie: p.gemCategorie ?? "midden",
  };
}

/**
 * Debounced API (or fallback) calculation for cur and nw.
 * Returns breakdown, employer cost, and partner recommendations for both scenarios.
 */
export function useDebouncedCalculate(cur, nw) {
  const { sessionId, visitorId } = useSessionContext();
  const { calculate } = useCalculate(sessionId, visitorId);
  const [resultCur, setResultCur] = useState(null);
  const [resultNw, setResultNw] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef(null);
  const isFirstMount = useRef(true);
  const curStr = JSON.stringify(cur);
  const nwStr = JSON.stringify(nw);

  const runCalculate = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resC, resN] = await Promise.all([
        calculate(toApiParams(cur)),
        calculate(toApiParams(nw)),
      ]);
      setResultCur({
        breakdown: resC.breakdown,
        employerCost: resC.employerCost ?? null,
        recommendedPartners: resC.recommendedPartners ?? [],
        matchedPartner: resC.matchedPartner ?? null,
        profileType: resC.profileType ?? null,
      });
      setResultNw({
        breakdown: resN.breakdown,
        employerCost: resN.employerCost ?? null,
        recommendedPartners: resN.recommendedPartners ?? [],
        matchedPartner: resN.matchedPartner ?? null,
        profileType: resN.profileType ?? null,
      });
    } catch {
      setResultCur(null);
      setResultNw(null);
    } finally {
      setIsLoading(false);
    }
  }, [curStr, nwStr, calculate]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const delay = isFirstMount.current ? 0 : DEBOUNCE_MS;
    if (isFirstMount.current) isFirstMount.current = false;
    timerRef.current = setTimeout(runCalculate, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [runCalculate]);

  return {
    rC: resultCur?.breakdown ?? null,
    rN: resultNw?.breakdown ?? null,
    employerCostCur: resultCur?.employerCost ?? null,
    employerCostNw: resultNw?.employerCost ?? null,
    recommendedPartnersCur: resultCur?.recommendedPartners ?? [],
    recommendedPartnersNw: resultNw?.recommendedPartners ?? [],
    matchedPartnerCur: resultCur?.matchedPartner ?? null,
    matchedPartnerNw: resultNw?.matchedPartner ?? null,
    profileTypeCur: resultCur?.profileType ?? null,
    profileTypeNw: resultNw?.profileType ?? null,
    isLoading,
  };
}
