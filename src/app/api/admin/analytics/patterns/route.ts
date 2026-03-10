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

export async function GET(request: NextRequest) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;

  const { from, to } = parseDateRange(request);

  try {
    const events = await prisma.event.findMany({
      where: { type: "pattern_detected", createdAt: { gte: from, lte: to } },
      select: { payload: true },
    });

    const patternCounts: Record<string, number> = {
      job_seeker: 0,
      promotion: 0,
      career_explorer: 0,
      comparison_shopper: 0,
      none: 0,
    };
    for (const e of events) {
      const p = e.payload as { type?: string } | null;
      const t = p?.type ?? "none";
      patternCounts[t] = (patternCounts[t] ?? 0) + 1;
    }

    const total = events.length;
    const breakdown = Object.entries(patternCounts).map(([type, count]) => ({
      type,
      count,
      pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }));

    return NextResponse.json({ breakdown, total });
  } catch (e) {
    console.error("[admin/analytics/patterns]", e);
    return NextResponse.json({ error: "Failed to load patterns" }, { status: 500 });
  }
}
