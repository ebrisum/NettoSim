/**
 * Delta tracker: compute deltas between consecutive simulation params/results.
 * Used for analytics and optional event payloads.
 */

export interface SimulationSnapshot {
  timestamp: number;
  params: Record<string, unknown>;
  gross?: number;
  net?: number;
}

export interface DeltaEntry {
  field: string;
  before: unknown;
  after: unknown;
  delta?: number;
}

/**
 * Compute which fields changed between two param objects.
 */
export function computeParamDeltas(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): DeltaEntry[] {
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const entries: DeltaEntry[] = [];
  for (const key of allKeys) {
    const b = before[key];
    const a = after[key];
    if (a === b) continue;
    const delta =
      typeof b === "number" && typeof a === "number" ? a - b : undefined;
    entries.push({ field: key, before: b, after: a, delta });
  }
  return entries;
}

/**
 * Compute delta between two snapshots (for display or logging).
 */
export function computeSnapshotDelta(
  before: SimulationSnapshot,
  after: SimulationSnapshot
): { paramDeltas: DeltaEntry[]; netDelta?: number; grossDelta?: number } {
  const paramDeltas = computeParamDeltas(before.params, after.params);
  const netDelta =
    after.net != null && before.net != null ? after.net - before.net : undefined;
  const grossDelta =
    after.gross != null && before.gross != null
      ? after.gross - before.gross
      : undefined;
  return { paramDeltas, netDelta, grossDelta };
}
