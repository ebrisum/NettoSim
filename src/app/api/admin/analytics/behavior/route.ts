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
    const sessions = await prisma.session.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: {
        _count: { select: { simulations: true, events: true } },
        events: { select: { type: true } },
      },
    });

    const simsPerSession: number[] = sessions.map((s) => s._count.simulations);
    const avgSimsPerSession =
      simsPerSession.length > 0
        ? simsPerSession.reduce((a, b) => a + b, 0) / simsPerSession.length
        : 0;

    const eventTypeCounts: Record<string, number> = {};
    for (const s of sessions) {
      for (const e of s.events) {
        eventTypeCounts[e.type] = (eventTypeCounts[e.type] || 0) + 1;
      }
    }
    const mostUsedFeatures = Object.entries(eventTypeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const employerToggleCount = eventTypeCounts["employer_toggle"] ?? eventTypeCounts["toggle_employer"] ?? 0;
    const employerToggleRate =
      sessions.length > 0 ? Math.round((employerToggleCount / sessions.length) * 1000) / 10 : 0;

    return NextResponse.json({
      avgSimulationsPerSession: Math.round(avgSimsPerSession * 100) / 100,
      simsPerSessionDistribution: {
        "0": simsPerSession.filter((n) => n === 0).length,
        "1": simsPerSession.filter((n) => n === 1).length,
        "2-5": simsPerSession.filter((n) => n >= 2 && n <= 5).length,
        "6-10": simsPerSession.filter((n) => n >= 6 && n <= 10).length,
        "10+": simsPerSession.filter((n) => n > 10).length,
      },
      mostUsedFeatures,
      employerViewToggleRate: employerToggleRate,
    });
  } catch (e) {
    console.error("[admin/analytics/behavior]", e);
    return NextResponse.json({ error: "Failed to load behavior" }, { status: 500 });
  }
}
