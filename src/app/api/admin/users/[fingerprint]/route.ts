import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "lib/admin-api";
import { prisma } from "lib/db";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ fingerprint: string }> }
) {
  const unauth = await verifyAdmin(_request);
  if (unauth) return unauth;

  const { fingerprint } = await context.params;
  const fpDecoded = decodeURIComponent(fingerprint);

  try {
    const sessions = await prisma.session.findMany({
      where: { fingerprintHash: fpDecoded },
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { simulations: true, events: true } },
        simulations: { select: { gross: true, net: true, createdAt: true } },
        events: { select: { type: true, createdAt: true } },
      },
    });

    if (sessions.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const grossValues = sessions.flatMap((s) => s.simulations.map((x) => x.gross).filter((g): g is number => g != null));
    const eventTypes: Record<string, number> = {};
    for (const s of sessions) {
      for (const e of s.events) {
        eventTypes[e.type] = (eventTypes[e.type] || 0) + 1;
      }
    }

    return NextResponse.json({
      fingerprint: fpDecoded,
      firstSeen: sessions[0]!.createdAt.toISOString(),
      lastSeen: sessions[sessions.length - 1]!.lastActiveAt.toISOString(),
      totalSessions: sessions.length,
      totalSimulations: sessions.reduce((a, s) => a + s._count.simulations, 0),
      totalEvents: sessions.reduce((a, s) => a + s._count.events, 0),
      salaryHistory: sessions.flatMap((s) =>
        s.simulations.map((sim) => ({ gross: sim.gross, net: sim.net, createdAt: sim.createdAt.toISOString() }))
      ),
      eventTypeCounts: eventTypes,
      sessions: sessions.map((s) => ({
        id: s.id,
        createdAt: s.createdAt.toISOString(),
        lastActiveAt: s.lastActiveAt.toISOString(),
        referrer: s.referrer,
        simCount: s._count.simulations,
        eventCount: s._count.events,
      })),
    });
  } catch (e) {
    console.error("[admin/users/[fingerprint]]", e);
    return NextResponse.json({ error: "Failed to load user" }, { status: 500 });
  }
}
