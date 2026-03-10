import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "lib/admin-api";
import { prisma } from "lib/db";
import { hashForStorage } from "lib/hash";
import { randomBytes } from "crypto";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "partner";
}

export async function GET(request: NextRequest) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;

  try {
    const tenants = await prisma.tenant.findMany({
      orderBy: [{ partnerPageOrder: "asc" }, { createdAt: "desc" }],
    });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const stats = await Promise.all(
      tenants.map(async (t) => {
        const simCount = await prisma.simulation.count({
          where: { session: { tenantId: t.id } },
        });
        const simCount30 = await prisma.simulation.count({
          where: {
            session: { tenantId: t.id },
            createdAt: { gte: thirtyDaysAgo },
          },
        });
        return { tenantId: t.id, simCount, simCount30 };
      })
    );
    const statsMap = Object.fromEntries(stats.map((s) => [s.tenantId, s]));

    const list = tenants.map((t) => {
      const s = statsMap[t.id] || { simCount: 0, simCount30: 0 };
      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        isActive: t.isActive,
        contactEmail: t.contactEmail,
        primaryColor: t.primaryColor,
        logoUrl: t.logoUrl,
        showOnPartnerPage: t.showOnPartnerPage,
        partnerPageOrder: t.partnerPageOrder,
        partnerTier: t.partnerTier,
        createdAt: t.createdAt.toISOString(),
        simCount: s.simCount,
        simCount30: s.simCount30,
      };
    });

    return NextResponse.json({ partners: list });
  } catch (e) {
    console.error("[admin/partners GET]", e);
    return NextResponse.json({ error: "Failed to list partners" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;

  try {
    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const contactEmail = typeof body.contactEmail === "string" ? body.contactEmail.trim() : "";
    const slug = typeof body.slug === "string" ? body.slug.trim() || slugify(name) : slugify(name);
    const partnerDescription =
      typeof body.partnerDescription === "string"
        ? body.partnerDescription.trim().slice(0, 4000) || null
        : null;
    const showOnPartnerPage =
      typeof body.showOnPartnerPage === "boolean" ? body.showOnPartnerPage : true;
    const partnerTier =
      typeof body.partnerTier === "string" &&
      ["featured", "standard", "hidden"].includes(body.partnerTier)
        ? body.partnerTier
        : "standard";
    const customConfig =
      body.customConfig && typeof body.customConfig === "object"
        ? body.customConfig
        : { targetProfiles: ["all"] };

    if (!name) {
      return NextResponse.json({ error: "Company name required" }, { status: 400 });
    }

    const existing = await prisma.tenant.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: "Slug already in use" }, { status: 400 });
    }

    const rawKey = "sk_" + randomBytes(24).toString("hex");
    const apiKeyHash = hashForStorage(rawKey);

    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug,
        contactEmail: contactEmail || null,
        apiKeyHash,
        primaryColor: body.primaryColor ?? null,
        logoUrl: body.logoUrl ?? null,
        customCss: body.customCss ?? null,
        customConfig: customConfig ?? undefined,
        showOnPartnerPage,
        partnerDescription,
        partnerTier,
      },
    });

    return NextResponse.json({
      partner: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        isActive: tenant.isActive,
        contactEmail: tenant.contactEmail,
        showOnPartnerPage: tenant.showOnPartnerPage,
        partnerTier: tenant.partnerTier,
        createdAt: tenant.createdAt.toISOString(),
      },
      apiKey: rawKey,
      message: "Save the API key; it will not be shown again.",
    });
  } catch (e) {
    console.error("[admin/partners POST]", e);
    return NextResponse.json({ error: "Failed to create partner" }, { status: 500 });
  }
}
