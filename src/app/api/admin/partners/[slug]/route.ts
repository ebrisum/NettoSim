import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { verifyAdmin } from "lib/admin-api";
import { prisma } from "lib/db";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const unauth = await verifyAdmin(_request);
  if (unauth) return unauth;

  const { slug } = await context.params;
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) return NextResponse.json({ error: "Partner not found" }, { status: 404 });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const [simCount, simCount30, sessions30] = await Promise.all([
      prisma.simulation.count({ where: { session: { tenantId: tenant.id } } }),
      prisma.simulation.count({
        where: { session: { tenantId: tenant.id }, createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.session.findMany({
        where: { tenantId: tenant.id, createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
      }),
    ]);

    const dayMap = new Map<string, number>();
    for (const s of sessions30) {
      const key = new Date(s.createdAt).toISOString().slice(0, 10);
      dayMap.set(key, (dayMap.get(key) || 0) + 1);
    }
    const sessionsOverTime = Array.from(dayMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));

    return NextResponse.json({
      partner: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        isActive: tenant.isActive,
        apiKeyHash: tenant.apiKeyHash ? "••••••••" : null,
        contactEmail: tenant.contactEmail,
        primaryColor: tenant.primaryColor,
        logoUrl: tenant.logoUrl,
        customCss: tenant.customCss,
        customConfig: tenant.customConfig,
        showOnPartnerPage: tenant.showOnPartnerPage,
        partnerPageOrder: tenant.partnerPageOrder,
        partnerDescription: tenant.partnerDescription,
        partnerTier: tenant.partnerTier,
        createdAt: tenant.createdAt.toISOString(),
        updatedAt: tenant.updatedAt.toISOString(),
      },
      stats: { simCount, simCount30, uniqueVisitors30: sessions30.length },
      sessionsOverTime,
    });
  } catch (e) {
    console.error("[admin/partners/[slug] GET]", e);
    return NextResponse.json({ error: "Failed to load partner" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;

  const { slug } = await context.params;
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) return NextResponse.json({ error: "Partner not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const updates: Prisma.TenantUpdateInput = {};

    if (typeof body.name === "string") updates.name = body.name.trim();
    if (typeof body.contactEmail === "string") updates.contactEmail = body.contactEmail.trim() || null;
    if (typeof body.slug === "string" && body.slug.trim() !== slug) {
      const existing = await prisma.tenant.findUnique({ where: { slug: body.slug.trim() } });
      if (existing) return NextResponse.json({ error: "Slug already in use" }, { status: 400 });
      updates.slug = body.slug.trim();
    }
    if (typeof body.isActive === "boolean") updates.isActive = body.isActive;
    if (body.primaryColor !== undefined) updates.primaryColor = body.primaryColor;
    if (body.logoUrl !== undefined) updates.logoUrl = body.logoUrl;
    if (body.customCss !== undefined) updates.customCss = body.customCss;
    if (body.customConfig !== undefined) {
      updates.customConfig =
        body.customConfig === null
          ? Prisma.JsonNull
          : (body.customConfig as Prisma.InputJsonValue);
    }
    if (typeof body.showOnPartnerPage === "boolean") updates.showOnPartnerPage = body.showOnPartnerPage;
    if (typeof body.partnerPageOrder === "number") updates.partnerPageOrder = body.partnerPageOrder;
    if (body.partnerDescription !== undefined) updates.partnerDescription = body.partnerDescription;
    if (typeof body.partnerTier === "string") updates.partnerTier = body.partnerTier;

    const updated = await prisma.tenant.update({
      where: { id: tenant.id },
      data: updates,
    });

    return NextResponse.json({
      partner: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        isActive: updated.isActive,
        contactEmail: updated.contactEmail,
        showOnPartnerPage: updated.showOnPartnerPage,
        partnerPageOrder: updated.partnerPageOrder,
        partnerTier: updated.partnerTier,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    console.error("[admin/partners/[slug] PUT]", e);
    return NextResponse.json({ error: "Failed to update partner" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const unauth = await verifyAdmin(_request);
  if (unauth) return unauth;

  const { slug } = await context.params;
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) return NextResponse.json({ error: "Partner not found" }, { status: 404 });

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { isActive: false },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/partners/[slug] DELETE]", e);
    return NextResponse.json({ error: "Failed to deactivate partner" }, { status: 500 });
  }
}
