import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "lib/admin-api";
import { prisma } from "lib/db";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export async function GET(request: NextRequest) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;

  const period = request.nextUrl.searchParams.get("period") || "30d";
  const days = period === "90d" ? 90 : period === "7d" ? 7 : 30;
  const from = startOfDay(new Date(Date.now() - days * 86400000));

  try {
    const sessions = await prisma.session.findMany({
      where: { createdAt: { gte: from } },
      select: { createdAt: true },
    });
    const sims = await prisma.simulation.findMany({
      where: { createdAt: { gte: from } },
      select: { createdAt: true },
    });

    const dayMap = new Map<string, { sessions: number; simulations: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(from);
      d.setUTCDate(d.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      dayMap.set(key, { sessions: 0, simulations: 0 });
    }
    for (const r of sessions) {
      const key = new Date(r.createdAt).toISOString().slice(0, 10);
      const cur = dayMap.get(key);
      if (cur) cur.sessions += 1;
    }
    for (const r of sims) {
      const key = new Date(r.createdAt).toISOString().slice(0, 10);
      const cur = dayMap.get(key);
      if (cur) cur.simulations += 1;
    }

    const dates = Array.from(dayMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({ date, sessions: v.sessions, simulations: v.simulations }));

    return NextResponse.json({ dates });
  } catch (e) {
    console.error("[admin/stats/timeseries]", e);
    return NextResponse.json(
      { error: "Failed to load timeseries" },
      { status: 500 }
    );
  }
}
