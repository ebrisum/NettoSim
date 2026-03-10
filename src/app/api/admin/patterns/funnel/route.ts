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
      include: {
        _count: { select: { simulations: true } },
        events: { where: { type: "pattern_detected" }, take: 1 },
      },
    });

    const step1 = sessions.length;
    const step2 = sessions.filter((s) => s._count.simulations >= 1).length;
    const step3 = sessions.filter((s) => s._count.simulations >= 2).length;
    const step4 = sessions.filter((s) => s.events.length > 0).length;

    return NextResponse.json({
      funnel: [
        { step: "Sessions", count: step1, rate: 100 },
        { step: "1+ calc", count: step2, rate: step1 > 0 ? Math.round((step2 / step1) * 1000) / 10 : 0 },
        { step: "2+ calcs", count: step3, rate: step1 > 0 ? Math.round((step3 / step1) * 1000) / 10 : 0 },
        { step: "Pattern", count: step4, rate: step1 > 0 ? Math.round((step4 / step1) * 1000) / 10 : 0 },
      ],
    });
  } catch (e) {
    console.error("[admin/patterns/funnel]", e);
    return NextResponse.json({ error: "Failed to load funnel" }, { status: 500 });
  }
}
