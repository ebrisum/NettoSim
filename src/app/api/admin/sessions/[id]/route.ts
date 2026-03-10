import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "lib/admin-api";
import { prisma } from "lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Session ID required" }, { status: 400 });
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        events: { orderBy: { createdAt: "asc" } },
        simulations: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const tenant = session.tenantId
      ? await prisma.tenant.findUnique({
          where: { id: session.tenantId },
          select: { name: true, slug: true },
        })
      : null;

    const events = session.events.map((e) => ({
      id: e.id,
      type: e.type,
      payload: e.payload,
      createdAt: e.createdAt.toISOString(),
    }));

    const simulations = session.simulations.map((s) => ({
      id: s.id,
      gross: s.gross,
      net: s.net,
      effectiveRate: s.effectiveRate,
      createdAt: s.createdAt.toISOString(),
    }));

    // Derive pattern from events if any event has type pattern_detected
    const patternEvent = session.events.find((e) => e.type === "pattern_detected");
    const pattern = patternEvent?.payload as Record<string, unknown> | null ?? null;

    return NextResponse.json({
      session: {
        id: session.id,
        fingerprintHash: session.fingerprintHash,
        referrer: session.referrer,
        userAgent: session.userAgent,
        tenantId: session.tenantId,
        createdAt: session.createdAt.toISOString(),
        lastActiveAt: session.lastActiveAt.toISOString(),
        tenantName: tenant?.name ?? null,
        tenantSlug: tenant?.slug ?? null,
      },
      events,
      simulations,
      pattern,
    });
  } catch (e) {
    console.error("[admin/sessions/[id]]", e);
    return NextResponse.json(
      { error: "Failed to load session" },
      { status: 500 }
    );
  }
}
