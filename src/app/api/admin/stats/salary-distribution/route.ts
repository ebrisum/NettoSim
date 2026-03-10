import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "lib/admin-api";
import { prisma } from "lib/db";

const BUCKETS = [
  { min: 0, max: 20_000, range: "0-20k" },
  { min: 20_000, max: 30_000, range: "20k-30k" },
  { min: 30_000, max: 40_000, range: "30k-40k" },
  { min: 40_000, max: 50_000, range: "40k-50k" },
  { min: 50_000, max: 60_000, range: "50k-60k" },
  { min: 60_000, max: 80_000, range: "60k-80k" },
  { min: 80_000, max: 100_000, range: "80k-100k" },
  { min: 100_000, max: 1e9, range: "100k+" },
];

export async function GET(request: NextRequest) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;

  const period = request.nextUrl.searchParams.get("period") || "30d";
  const days = period === "90d" ? 90 : period === "7d" ? 7 : 30;
  const from = new Date(Date.now() - days * 86400000);

  try {
    const sims = await prisma.simulation.findMany({
      where: { createdAt: { gte: from }, gross: { not: null } },
      select: { gross: true },
    });

    const counts: Record<string, number> = {};
    for (const b of BUCKETS) counts[b.range] = 0;
    for (const s of sims) {
      const g = s.gross ?? 0;
      const b = BUCKETS.find((x) => g >= x.min && g < x.max) ?? BUCKETS[BUCKETS.length - 1];
      counts[b.range]++;
    }

    const ranges = BUCKETS.map((b) => ({ range: b.range, count: counts[b.range] }));
    return NextResponse.json({ ranges });
  } catch (e) {
    console.error("[admin/stats/salary-distribution]", e);
    return NextResponse.json(
      { error: "Failed to load salary distribution" },
      { status: 500 }
    );
  }
}
