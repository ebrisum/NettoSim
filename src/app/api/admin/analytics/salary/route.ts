import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "lib/admin-api";
import { prisma } from "lib/db";

function parseDateRange(request: NextRequest): { from: Date; to: Date } {
  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");
  const to = toParam ? new Date(toParam) : new Date();
  const from = fromParam ? new Date(fromParam) : new Date(to.getTime() - 30 * 86400000);
  return { from, to };
}

const BUCKETS = [
  { min: 0, max: 20000, range: "0-20k" },
  { min: 20000, max: 30000, range: "20k-30k" },
  { min: 30000, max: 40000, range: "30k-40k" },
  { min: 40000, max: 50000, range: "40k-50k" },
  { min: 50000, max: 60000, range: "50k-60k" },
  { min: 60000, max: 80000, range: "60k-80k" },
  { min: 80000, max: 100000, range: "80k-100k" },
  { min: 100000, max: 1e9, range: "100k+" },
];

export async function GET(request: NextRequest) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;

  const { from, to } = parseDateRange(request);

  try {
    const sims = await prisma.simulation.findMany({
      where: { createdAt: { gte: from, lte: to }, gross: { not: null } },
      select: { gross: true, sessionId: true },
    });

    const sessionIds = [...new Set(sims.map((s) => s.sessionId))];
    const sessions = await prisma.session.findMany({
      where: { id: { in: sessionIds } },
      select: { id: true, referrer: true },
    });
    const sessionReferrer: Record<string, string> = {};
    for (const s of sessions) {
      sessionReferrer[s.id] = s.referrer || "(direct)";
    }

    const counts: Record<string, number> = {};
    for (const b of BUCKETS) counts[b.range] = 0;
    const grossValues: number[] = [];
    for (const s of sims) {
      const g = s.gross ?? 0;
      grossValues.push(g);
      const b = BUCKETS.find((x) => g >= x.min && g < x.max) || BUCKETS[BUCKETS.length - 1];
      if (b) counts[b.range]++;
    }

    grossValues.sort((a, b) => a - b);
    const mid = Math.floor(grossValues.length / 2);
    const medianSalary =
      grossValues.length > 0
        ? grossValues.length % 2 === 1
          ? grossValues[mid]!
          : (grossValues[mid - 1]! + grossValues[mid]!) / 2
        : null;

    const byReferrer: Record<string, number[]> = {};
    for (const s of sims) {
      const ref = sessionReferrer[s.sessionId] ?? "(direct)";
      if (!byReferrer[ref]) byReferrer[ref] = [];
      if (s.gross != null) byReferrer[ref].push(s.gross);
    }
    const salaryByReferrer = Object.entries(byReferrer)
      .map(([referrer, vals]) => ({
        referrer,
        avgSalary: vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0,
        count: vals.length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      distribution: BUCKETS.map((b) => ({ range: b.range, count: counts[b.range] || 0 })),
      medianSalary,
      salaryByReferrer,
    });
  } catch (e) {
    console.error("[admin/analytics/salary]", e);
    return NextResponse.json({ error: "Failed to load salary analytics" }, { status: 500 });
  }
}
