import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "lib/admin-api";
import { prisma } from "lib/db";

export async function POST(request: NextRequest) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;

  try {
    const body = await request.json().catch(() => ({}));
    const fingerprint = typeof body.fingerprint === "string" ? body.fingerprint.trim() : "";

    if (!fingerprint) {
      return NextResponse.json({ error: "fingerprint required" }, { status: 400 });
    }

    const sessions = await prisma.session.findMany({
      where: { fingerprintHash: fingerprint },
      select: { id: true },
    });

    for (const s of sessions) {
      await prisma.event.deleteMany({ where: { sessionId: s.id } });
      await prisma.simulation.deleteMany({ where: { sessionId: s.id } });
      await prisma.session.delete({ where: { id: s.id } });
    }

    return NextResponse.json({ ok: true, deletedSessions: sessions.length });
  } catch (e) {
    console.error("[admin/settings/purge-user]", e);
    return NextResponse.json({ error: "Failed to purge user" }, { status: 500 });
  }
}
