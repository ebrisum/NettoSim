/**
 * Employer costs (werkgeverslasten) — 2025 Dutch rates.
 * Server-side only. Used for "Employer View" in the frontend.
 */

/** 2025 percentages: employer pension, disability (WIA), etc. */
const EMPLOYER_PENSION_BASE = 0; // employer part of pension; adjust per sector
const WIA_PERC = 0.0585; // WIA premie werkgever (approx)
const WAO_UV_PERC = 0.0044; // WAO/UV (historical)
const ZW_PERC = 0.0055; // Ziektewet
const TOTAL_EMPLOYER_SOCIAL = WIA_PERC + WAO_UV_PERC + ZW_PERC; // ~6.84%

/** Vacation pay (vakantiegeld) — typically 8% of gross. */
const VAKANTIE_PERC = 0.08;

export interface EmployerCostBreakdown {
  grossSalary: number;
  vacationPay: number;
  wia: number;
  waoUv: number;
  zw: number;
  otherEmployerSocial: number;
  totalEmployerCost: number;
}

/**
 * Compute total employer cost (bruto + werkgeverslasten) for a given gross salary.
 * Assumes standard Dutch employer contributions; no sector-specific rules.
 */
export function computeEmployerCosts(grossSalaryYear: number): EmployerCostBreakdown {
  if (grossSalaryYear <= 0) {
    return {
      grossSalary: 0,
      vacationPay: 0,
      wia: 0,
      waoUv: 0,
      zw: 0,
      otherEmployerSocial: 0,
      totalEmployerCost: 0,
    };
  }
  const vacationPay = grossSalaryYear * VAKANTIE_PERC;
  const wia = grossSalaryYear * WIA_PERC;
  const waoUv = grossSalaryYear * WAO_UV_PERC;
  const zw = grossSalaryYear * ZW_PERC;
  const otherEmployerSocial = grossSalaryYear * (EMPLOYER_PENSION_BASE);
  const totalEmployerCost =
    grossSalaryYear + vacationPay + wia + waoUv + zw + otherEmployerSocial;

  return {
    grossSalary: grossSalaryYear,
    vacationPay,
    wia,
    waoUv,
    zw,
    otherEmployerSocial,
    totalEmployerCost,
  };
}
