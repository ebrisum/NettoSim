import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "lib/admin-api";
import { prisma } from "lib/db";

export async function GET(request: NextRequest) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;

  const period = request.nextUrl.searchParams.get("period") || "30d";
  const days = period === "90d" ? 90 : period === "7d" ? 7 : 30;
  const from = new Date(Date.now() - days * 86400000);

  try {
    const sessions = await prisma.session.findMany({
      where: { createdAt: { gte: from } },
      select: { referrer: true },
    });

    const counts: Record<string, number> = {};
    for (const s of sessions) {
      const ref = s.referrer?.trim() || "(direct)";
      counts[ref] = (counts[ref] || 0) + 1;
    }

    const referrers = Object.entries(counts)
      .map(([referrer, count]) => ({ referrer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({ referrers });
  } catch (e) {
    console.error("[admin/stats/top-referrers]", e);
    return NextResponse.json(
      { error: "Failed to load top referrers" },
      { status: 500 }
    );
  }
}
