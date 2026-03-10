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
    const events = await prisma.event.findMany({
      where: { type: "pattern_detected", createdAt: { gte: from } },
      select: { payload: true },
    });

    const counts: Record<string, number> = {
      job_seeker: 0,
      promotion: 0,
      career_explorer: 0,
      comparison_shopper: 0,
      none: 0,
    };
    for (const e of events) {
      const p = e.payload as { type?: string } | null;
      const t = p?.type ?? "none";
      counts[t] = (counts[t] ?? 0) + 1;
    }

    const total = events.length;
    const cards = Object.entries(counts).map(([type, count]) => ({
      type,
      count,
      pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }));

    return NextResponse.json({ cards, total });
  } catch (e) {
    console.error("[admin/patterns/overview]", e);
    return NextResponse.json({ error: "Failed to load patterns overview" }, { status: 500 });
  }
}
