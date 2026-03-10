import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "lib/admin-api";
import { prisma } from "lib/db";

export async function GET(request: NextRequest) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;

  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");
  const from = fromParam ? new Date(fromParam) : new Date(Date.now() - 7 * 86400000);
  const to = toParam ? new Date(toParam) : new Date();

  try {
    const events = await prisma.event.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { type: true, sessionId: true },
    });

    const byType: Record<string, number> = {};
    const sessionIds = new Set<string>();
    for (const e of events) {
      byType[e.type] = (byType[e.type] || 0) + 1;
      sessionIds.add(e.sessionId);
    }

    const total = events.length;
    const stats = Object.entries(byType)
      .map(([type, count]) => ({
        type,
        count,
        pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const avgPerSession = sessionIds.size > 0 ? Math.round((total / sessionIds.size) * 100) / 100 : 0;

    return NextResponse.json({
      byType: stats,
      totalEvents: total,
      uniqueSessions: sessionIds.size,
      avgPerSession,
    });
  } catch (e) {
    console.error("[admin/events/stats]", e);
    return NextResponse.json({ error: "Failed to load event stats" }, { status: 500 });
  }
}
