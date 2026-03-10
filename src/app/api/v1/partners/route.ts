import { NextRequest, NextResponse } from "next/server";
import { prisma } from "lib/db";
import {
  deriveProfileSignals,
  deriveProfileType,
  rankPartnersForProfile,
  type ProfileType,
} from "lib/visitor-profile";

export async function GET(request: NextRequest) {
  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(request.nextUrl.searchParams.get("limit") || "12", 10) || 12)
  );
  const profileTypeParam = request.nextUrl.searchParams.get("profileType");
  const province = request.nextUrl.searchParams.get("province") || "Onbekend";
  const gross = Number.parseFloat(request.nextUrl.searchParams.get("gross") || "0") || 0;

  try {
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true, showOnPartnerPage: true },
      orderBy: [{ partnerPageOrder: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        partnerDescription: true,
        partnerTier: true,
        contactEmail: true,
        logoUrl: true,
        primaryColor: true,
        customConfig: true,
        showOnPartnerPage: true,
        isActive: true,
        partnerPageOrder: true,
      },
      take: 500,
    });

    const signals = deriveProfileSignals(
      {
        employment: gross,
        zzpIncome: 0,
        hasPartner: false,
        hasKids: false,
        isAOW: false,
        hasHome: false,
        isRenter: false,
        duoSchuld: 0,
        box3Spaargeld: 0,
        box3Beleggingen: 0,
        box3Schulden: 0,
        provincie: province,
        gemCategorie: "midden",
      },
      gross,
      undefined
    );

    const profileType =
      (profileTypeParam as ProfileType | null) || deriveProfileType(signals);

    const ranked = rankPartnersForProfile(tenants, profileType, signals)
      .slice(0, limit)
      .map((p) => {
        const tenant = tenants.find((t) => t.id === p.id);
        const config =
          tenant?.customConfig && typeof tenant.customConfig === "object"
            ? (tenant.customConfig as Record<string, unknown>)
            : {};
        const provinces = Array.isArray(config.provinces)
          ? config.provinces.filter((v): v is string => typeof v === "string")
          : [];
        const tags = Array.isArray(config.tags)
          ? config.tags.filter((v): v is string => typeof v === "string")
          : [];
        const partnerType =
          typeof config.partnerType === "string" && config.partnerType.trim()
            ? config.partnerType.trim()
            : tags[0] ?? null;
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          tier: p.tier,
          description: tenant?.partnerDescription ?? null,
          logoUrl: tenant?.logoUrl ?? null,
          primaryColor: tenant?.primaryColor ?? null,
          contactEmail: tenant?.contactEmail ?? null,
          provinces,
          tags,
          partnerType,
          score: p.score,
          reasons: p.reasons,
        };
      });

    return NextResponse.json({ profileType, partners: ranked });
  } catch (e) {
    console.error("[v1/partners]", e);
    return NextResponse.json({ error: "Failed to load partners" }, { status: 500 });
  }
}
