import { NextRequest, NextResponse } from "next/server";
import { prisma } from "lib/db";
import { supabaseAdmin } from "lib/supabase/server";
import { withApiLog, TENANT_ID_HEADER } from "lib/api-log";

async function getHandler(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "") ?? null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authUser?.id) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const tenantUser = await prisma.tenantUser.findUnique({
      where: { supabaseUserId: authUser.id },
      include: { tenant: true },
    });
    if (!tenantUser) {
      return NextResponse.json({ error: "Not a tenant user" }, { status: 403 });
    }

    const since = new Date();
    since.setDate(since.getDate() - 30);
    const simsRecent = await prisma.simulation.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    });
    const byDay: Record<string, number> = {};
    for (const row of simsRecent) {
      const d = row.createdAt.toISOString().slice(0, 10);
      byDay[d] = (byDay[d] ?? 0) + 1;
    }
    const dailySimulations = Object.entries(byDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const sims = await prisma.simulation.findMany({
      where: { gross: { not: null } },
      select: { gross: true as const },
      take: 10_000,
    });
    const grossValues = sims.map((s) => s.gross as number).filter((g) => g > 0);
    const bins = [0, 25_000, 40_000, 55_000, 70_000, 85_000, 100_000, 150_000, Infinity];
    const distribution = bins.slice(0, -1).map((low, i) => {
      const high = bins[i + 1];
      const count = grossValues.filter((g) => g >= low && g < high).length;
      return { range: `${low / 1000}k–${high === Infinity ? "∞" : high / 1000 + "k"}`, count };
    });

    const uniqueVisitors = await prisma.session.count();

    const sessionsWithReferrer = await prisma.session.findMany({
      where: { referrer: { not: null } },
      select: { referrer: true },
    });
    const referrerCount: Record<string, number> = {};
    for (const s of sessionsWithReferrer) {
      const r = (s.referrer ?? "").trim() || "direct";
      referrerCount[r] = (referrerCount[r] ?? 0) + 1;
    }
    const topReferrers = Object.entries(referrerCount)
      .map(([referrer, count]) => ({ referrer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const body = {
      tenant: { id: tenantUser.tenant.id, name: tenantUser.tenant.name, slug: tenantUser.tenant.slug },
      dailySimulations,
      salaryDistribution: distribution,
      uniqueVisitors,
      topReferrers,
    };
    const response = NextResponse.json(body);
    response.headers.set(TENANT_ID_HEADER, tenantUser.tenant.id);
    return response;
  } catch (e) {
    console.error("[tenant] error", e);
    return NextResponse.json(
      { error: "Failed to load tenant data" },
      { status: 500 }
    );
  }
}

export const GET = withApiLog(getHandler);
