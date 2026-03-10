import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "lib/admin-api";
import { prisma } from "lib/db";

export async function GET(request: NextRequest) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;

  const period = request.nextUrl.searchParams.get("period") || "24h";
  const hours = period === "7d" ? 24 * 7 : period === "30d" ? 24 * 30 : 24;
  const from = new Date(Date.now() - hours * 3600000);

  try {
    const logs = await prisma.apiLog.findMany({
      where: { createdAt: { gte: from } },
      select: { endpoint: true, method: true, statusCode: true, responseMs: true },
    });

    const byKey: Record<string, { count: number; totalMs: number; errors: number }> = {};
    for (const l of logs) {
      const key = `${l.method} ${l.endpoint}`;
      if (!byKey[key]) byKey[key] = { count: 0, totalMs: 0, errors: 0 };
      byKey[key].count += 1;
      byKey[key].totalMs += l.responseMs ?? 0;
      if (l.statusCode >= 400) byKey[key].errors += 1;
    }

    const usage = Object.entries(byKey).map(([endpoint, v]) => ({
      endpoint,
      calls: v.count,
      avgResponseMs: v.count > 0 ? Math.round(v.totalMs / v.count) : 0,
      errorRate: v.count > 0 ? Math.round((v.errors / v.count) * 1000) / 10 : 0,
    })).sort((a, b) => b.calls - a.calls);

    return NextResponse.json({ usage });
  } catch (e) {
    console.error("[admin/api/usage-by-endpoint]", e);
    return NextResponse.json({ error: "Failed to load usage" }, { status: 500 });
  }
}
