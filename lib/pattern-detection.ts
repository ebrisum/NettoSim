/**
 * Pattern detection for simulation flows: job seeker, promotion, comparison shopper, normal.
 * Used for analytics; no PII.
 */

export interface SimulationPoint {
  timestamp: number;
  gross?: number;
  params?: Record<string, unknown>;
}

export type DetectedPattern =
  | "job_seeker"
  | "promotion"
  | "comparison_shopper"
  | "normal"
  | null;

const WINDOW_MS = 3 * 60 * 1000; // 3 minutes
const JOB_SEEKER_MIN_SIMS = 5;
const JOB_SEEKER_SALARY_MIN = 40_000;
const JOB_SEEKER_SALARY_MAX = 100_000;
const PROMOTION_PCT = 0.15;
const PROMOTION_MIN_SIMS = 2;
const COMPARISON_SAME_SALARY_TOLERANCE = 500;
const COMPARISON_MIN_SIMS = 4;

/**
 * Detect pattern from a list of simulation points (chronological).
 */
export function detectPattern(points: SimulationPoint[]): DetectedPattern {
  if (points.length === 0) return null;
  const recent = points.filter((p) => Date.now() - p.timestamp < WINDOW_MS);
  if (recent.length < 2) return "normal";

  const salaries = recent.map((p) => p.gross ?? 0).filter((g) => g > 0);

  // Job seeker: many sims in window, salary range 40k–100k
  if (recent.length >= JOB_SEEKER_MIN_SIMS && salaries.length >= JOB_SEEKER_MIN_SIMS) {
    const minS = Math.min(...salaries);
    const maxS = Math.max(...salaries);
    if (minS >= JOB_SEEKER_SALARY_MIN && maxS <= JOB_SEEKER_SALARY_MAX) {
      return "job_seeker";
    }
  }

  // Promotion: 2 sims, second ~15% higher salary
  if (recent.length >= PROMOTION_MIN_SIMS && salaries.length >= PROMOTION_MIN_SIMS) {
    const [first, second] = salaries.slice(-2);
    if (first > 0 && second >= first * (1 + PROMOTION_PCT * 0.5)) {
      return "promotion";
    }
  }

  // Comparison shopper: several sims with same salary, different toggles
  if (recent.length >= COMPARISON_MIN_SIMS) {
    const grossValues = recent.map((p) => p.gross ?? 0);
    const sameSalary = grossValues.every(
      (g, i, arr) => i === 0 || Math.abs(g - arr[0]) <= COMPARISON_SAME_SALARY_TOLERANCE
    );
    if (sameSalary && grossValues.some((g) => g > 0)) {
      return "comparison_shopper";
    }
  }

  return "normal";
}
