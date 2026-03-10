import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "lib/admin-api";
import { prisma } from "lib/db";

export async function POST(request: NextRequest) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;

  try {
    const [sessions, events, simulations, tenants, subscribers, campaigns, settings] = await Promise.all([
      prisma.session.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.event.findMany({ orderBy: { createdAt: "desc" }, take: 50_000 }),
      prisma.simulation.findMany({ orderBy: { createdAt: "desc" }, take: 50_000 }),
      prisma.tenant.findMany(),
      prisma.subscriber.findMany(),
      prisma.emailCampaign.findMany(),
      prisma.adminSetting.findMany(),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      sessions: sessions.map((s) => ({
        id: s.id,
        ipHash: s.ipHash,
        fingerprintHash: s.fingerprintHash,
        referrer: s.referrer,
        tenantId: s.tenantId,
        createdAt: s.createdAt.toISOString(),
        lastActiveAt: s.lastActiveAt.toISOString(),
      })),
      events: events.map((e) => ({
        id: e.id,
        sessionId: e.sessionId,
        type: e.type,
        payload: e.payload,
        createdAt: e.createdAt.toISOString(),
      })),
      simulations: simulations.map((s) => ({
        id: s.id,
        sessionId: s.sessionId,
        gross: s.gross,
        net: s.net,
        effectiveRate: s.effectiveRate,
        createdAt: s.createdAt.toISOString(),
      })),
      tenants: tenants.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        isActive: t.isActive,
        contactEmail: t.contactEmail,
        showOnPartnerPage: t.showOnPartnerPage,
        partnerPageOrder: t.partnerPageOrder,
        partnerTier: t.partnerTier,
        createdAt: t.createdAt.toISOString(),
      })),
      subscribers: subscribers.map((s) => ({
        id: s.id,
        email: s.email,
        source: s.source,
        tags: s.tags,
        isActive: s.isActive,
        subscribedAt: s.subscribedAt.toISOString(),
      })),
      campaigns: campaigns.map((c) => ({
        id: c.id,
        subject: c.subject,
        status: c.status,
        recipientCount: c.recipientCount,
        sentAt: c.sentAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
      })),
      settings: settings.map((s) => ({ key: s.key, value: s.value })),
    };

    return NextResponse.json(exportData, {
      headers: {
        "Content-Disposition": "attachment; filename=nettosim-export.json",
      },
    });
  } catch (e) {
    console.error("[admin/settings/export]", e);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
