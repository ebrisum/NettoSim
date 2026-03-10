import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "lib/admin-api";
import { prisma } from "lib/db";

export async function GET(request: NextRequest) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;

  const period = request.nextUrl.searchParams.get("period") || "30d";
  const limit = Math.min(
    100,
    parseInt(request.nextUrl.searchParams.get("limit") || "50", 10) || 50
  );
  const days = period === "90d" ? 90 : period === "7d" ? 7 : 30;
  const from = new Date(Date.now() - days * 86400000);

  try {
    const events = await prisma.event.findMany({
      where: { type: "pattern_detected", createdAt: { gte: from } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, sessionId: true, payload: true, createdAt: true },
    });

    const triggers = events.map((e) => {
      const p = e.payload as { type?: string; trigger?: string; salary?: number } | null;
      return {
        id: e.id,
        sessionId: e.sessionId,
        patternType: p?.type ?? null,
        trigger: p?.trigger ?? null,
        salaryContext: p?.salary ?? null,
        createdAt: e.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ triggers });
  } catch (e) {
    console.error("[admin/patterns/triggers]", e);
    return NextResponse.json({ error: "Failed to load triggers" }, { status: 500 });
  }
}
