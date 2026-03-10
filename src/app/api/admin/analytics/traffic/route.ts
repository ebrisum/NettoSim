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
      select: { createdAt: true },
    });
    const sims = await prisma.simulation.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { createdAt: true },
    });
    const uniqueByFp = await prisma.session.groupBy({
      by: ["fingerprintHash"],
      where: { createdAt: { gte: from, lte: to } },
    });

    const dayMap = new Map<string, { sessions: number; simulations: number }>();
    for (const s of sessions) {
      const key = new Date(s.createdAt).toISOString().slice(0, 10);
      if (!dayMap.has(key)) dayMap.set(key, { sessions: 0, simulations: 0 });
      dayMap.get(key)!.sessions += 1;
    }
    for (const s of sims) {
      const key = new Date(s.createdAt).toISOString().slice(0, 10);
      const cur = dayMap.get(key);
      if (cur) cur.simulations += 1;
    }

    const totalSessions = sessions.length;
    const totalSimulations = sims.length;
    const uniqueVisitors = uniqueByFp.length;
    const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000));
    const entries = Array.from(dayMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const peakDay = entries.length ? entries.reduce((a, b) => (b[1].sessions > a[1].sessions ? b : a)) : null;

    return NextResponse.json({
      daily: entries.map(([date, v]) => ({ date, sessions: v.sessions, simulations: v.simulations })),
      summary: {
        totalSessions,
        totalSimulations,
        uniqueVisitors,
        avgSessionsPerDay: Math.round((totalSessions / days) * 10) / 10,
        avgSimulationsPerDay: Math.round((totalSimulations / days) * 10) / 10,
        peakDay: peakDay ? { date: peakDay[0], sessions: peakDay[1].sessions } : null,
      },
    });
  } catch (e) {
    console.error("[admin/analytics/traffic]", e);
    return NextResponse.json({ error: "Failed to load traffic" }, { status: 500 });
  }
}
