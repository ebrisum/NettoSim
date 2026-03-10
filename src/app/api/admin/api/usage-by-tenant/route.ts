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
      select: { tenantId: true, createdAt: true },
    });

    const byTenant: Record<string, { count24: number; lastAt: Date }> = {};
    const day30 = new Date(Date.now() - 30 * 86400000);
    for (const l of logs) {
      const key = l.tenantId ?? "direct";
      if (!byTenant[key]) byTenant[key] = { count24: 0, lastAt: l.createdAt };
      byTenant[key].count24 += 1;
      if (l.createdAt > byTenant[key].lastAt) byTenant[key].lastAt = l.createdAt;
    }

    const tenantIds = Object.keys(byTenant).filter((k) => k !== "direct");
    const tenants = tenantIds.length
      ? await prisma.tenant.findMany({
          where: { id: { in: tenantIds } },
          select: { id: true, name: true, slug: true },
        })
      : [];
    const nameMap = Object.fromEntries(tenants.map((t) => [t.id, t.name ?? t.slug]));

    const usage = Object.entries(byTenant).map(([id, v]) => ({
      tenantId: id,
      tenantName: id === "direct" ? "Direct" : nameMap[id] ?? id,
      calls: v.count24,
      lastUsed: v.lastAt.toISOString(),
    })).sort((a, b) => b.calls - a.calls);

    return NextResponse.json({ usage });
  } catch (e) {
    console.error("[admin/api/usage-by-tenant]", e);
    return NextResponse.json({ error: "Failed to load usage" }, { status: 500 });
  }
}
