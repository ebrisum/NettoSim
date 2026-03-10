import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "lib/admin-api";
import { prisma } from "lib/db";

const TWO_MIN_MS = 2 * 60 * 1000;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export async function GET(request: NextRequest) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;
  try {
    const now = new Date();
    const todayStart = startOfDay(now);
    const yesterdayStart = startOfDay(new Date(now.getTime() - 86400000));
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

    const liveUsers = await prisma.session.count({
      where: { lastActiveAt: { gte: new Date(now.getTime() - TWO_MIN_MS) } },
    });
    const todaySessions = await prisma.session.count({
      where: { createdAt: { gte: todayStart } },
    });
    const todaySimulations = await prisma.simulation.count({
      where: { createdAt: { gte: todayStart } },
    });
    const yesterdaySessions = await prisma.session.count({
      where: { createdAt: { gte: yesterdayStart, lt: todayStart } },
    });
    const yesterdaySimulations = await prisma.simulation.count({
      where: { createdAt: { gte: yesterdayStart, lt: todayStart } },
    });
    const visitorGroups = await prisma.session.groupBy({
      by: ["visitorId"],
      where: { createdAt: { gte: thirtyDaysAgo }, visitorId: { not: null } },
    });
    const fingerprintGroups = await prisma.session.groupBy({
      by: ["fingerprintHash"],
      where: {
        createdAt: { gte: thirtyDaysAgo },
        visitorId: null,
        fingerprintHash: { not: null },
      },
    });
    const activePartners = await prisma.tenant.count({
      where: { isActive: true },
    });
    const avgSalaryResult = await prisma.simulation.aggregate({
      where: { createdAt: { gte: todayStart }, gross: { not: null } },
      _avg: { gross: true },
    });

    const avgSalary = avgSalaryResult._avg.gross ?? 0;
    const sessionsChange = yesterdaySessions
      ? Math.round(((todaySessions - yesterdaySessions) / yesterdaySessions) * 100)
      : 0;
    const simulationsChange = yesterdaySimulations
      ? Math.round(((todaySimulations - yesterdaySimulations) / yesterdaySimulations) * 100)
      : 0;

    const uniqueVisitors30d = visitorGroups.length + fingerprintGroups.length;

    return NextResponse.json({
      liveUsers,
      todaySessions,
      todaySimulations,
      uniqueVisitors30d,
      avgSalary: Math.round(avgSalary),
      activePartners,
      changeVsYesterday: { sessions: sessionsChange, simulations: simulationsChange },
    });
  } catch (e) {
    console.error("[admin/stats/overview]", e);
    return NextResponse.json({ error: "Failed to load overview stats" }, { status: 500 });
  }
}
