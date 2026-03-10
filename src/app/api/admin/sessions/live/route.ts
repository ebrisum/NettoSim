import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "lib/admin-api";
import { prisma } from "lib/db";

const FIVE_MIN_MS = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;

  try {
    const since = new Date(Date.now() - FIVE_MIN_MS);
    const sessions = await prisma.session.findMany({
      where: { lastActiveAt: { gte: since } },
      orderBy: { lastActiveAt: "desc" },
      include: {
        simulations: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { gross: true },
        },
        _count: { select: { simulations: true, events: true } },
      },
    });

    const tenantIds = [...new Set(sessions.map((s) => s.tenantId).filter(Boolean))] as string[];
    const tenants = tenantIds.length
      ? await prisma.tenant.findMany({
          where: { id: { in: tenantIds } },
          select: { id: true, name: true, slug: true },
        })
      : [];
    const tenantMap = Object.fromEntries(tenants.map((t) => [t.id, t]));

    const list = sessions.map((s) => {
      const lastSalary = s.simulations[0]?.gross ?? null;
      const tenant = s.tenantId ? tenantMap[s.tenantId] : null;
      const patternEvent = null; // could derive from events if we store pattern_detected
      return {
        id: s.id,
        fingerprint: s.fingerprintHash ? `${s.fingerprintHash.slice(0, 12)}…` : "Anonymous",
        startedAt: s.createdAt.toISOString(),
        lastActiveAt: s.lastActiveAt.toISOString(),
        simulationCount: s._count.simulations,
        lastSalary,
        pattern: patternEvent ?? null,
        tenantName: tenant?.name ?? "Direct",
        tenantSlug: tenant?.slug ?? null,
      };
    });

    return NextResponse.json({ sessions: list });
  } catch (e) {
    console.error("[admin/sessions/live]", e);
    return NextResponse.json(
      { error: "Failed to load live sessions" },
      { status: 500 }
    );
  }
}
