"use client";

/**
 * Client-side fallback for tax calculation when API is unavailable.
 * Used by useCalculate hook. Do not import server-only lib/tax-engine/index.ts in client.
 */
export { calc, calcMTR } from "@/lib/taxEngine";
