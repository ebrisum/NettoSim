import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "lib/admin-api";
import { prisma } from "lib/db";

export async function GET(request: NextRequest) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const weekStart = new Date(now.getTime() - 7 * 86400000);
  const monthStart = new Date(now.getTime() - 30 * 86400000);

  try {
    const [today, week, month, errors] = await Promise.all([
      prisma.apiLog.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.apiLog.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.apiLog.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.apiLog.aggregate({
        where: { createdAt: { gte: todayStart }, statusCode: { gte: 400 } },
        _count: true,
      }),
    ]);

    const totalToday = await prisma.apiLog.count({ where: { createdAt: { gte: todayStart } } });
    const errorRate = totalToday > 0 ? Math.round((errors._count / totalToday) * 1000) / 10 : 0;

    const avgMs = await prisma.apiLog.aggregate({
      where: { createdAt: { gte: todayStart } },
      _avg: { responseMs: true },
    });

    return NextResponse.json({
      callsToday: today,
      callsThisWeek: week,
      callsThisMonth: month,
      errorRate,
      avgResponseMs: avgMs._avg.responseMs ?? 0,
    });
  } catch (e) {
    console.error("[admin/api/stats]", e);
    return NextResponse.json({ error: "Failed to load API stats" }, { status: 500 });
  }
}
