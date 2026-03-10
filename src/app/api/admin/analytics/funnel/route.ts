import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "lib/admin-api";
import { prisma } from "lib/db";

function parseDateRange(request: NextRequest): { from: Date; to: Date } {
  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");
  const to = toParam ? new Date(toParam) : new Date();
  const from = fromParam ? new Date(fromParam) : new Date(to.getTime() - 30 * 86400000);
  return { from, to };
}

export async function GET(request: NextRequest) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;

  const { from, to } = parseDateRange(request);

  try {
    const sessions = await prisma.session.findMany({
      where: { createdAt: { gte: from, lte: to } },
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
        { step: "1+ calculation", count: step2, rate: step1 > 0 ? Math.round((step2 / step1) * 1000) / 10 : 0 },
        { step: "2+ calculations", count: step3, rate: step1 > 0 ? Math.round((step3 / step1) * 1000) / 10 : 0 },
        { step: "Pattern detected", count: step4, rate: step1 > 0 ? Math.round((step4 / step1) * 1000) / 10 : 0 },
      ],
    });
  } catch (e) {
    console.error("[admin/analytics/funnel]", e);
    return NextResponse.json({ error: "Failed to load funnel" }, { status: 500 });
  }
}
