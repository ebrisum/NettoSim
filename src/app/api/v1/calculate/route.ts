import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "lib/db";
import { calculateParamsSchema } from "lib/validation/calculate";
import { calculate } from "lib/tax-engine";
import { computeEmployerCosts } from "lib/tax-engine/employer-costs";
import { rateLimitCalculate } from "lib/rate-limit";
import { withApiLog } from "lib/api-log";
import { detectPattern } from "lib/pattern-detection";
import {
  deriveProfileSignals,
  deriveProfileType,
  rankPartnersForProfile,
  sanitizeCalculationParams,
} from "lib/visitor-profile";

function getIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const real = request.headers.get("x-real-ip");
  const ip = (forwarded?.split(",")[0]?.trim() || real || "anonymous").trim();
  return ip;
}

function sanitizeVisitorId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!/^v_[a-zA-Z0-9_-]{8,72}$/.test(v)) return null;
  return v;
}

async function persistCalculationContext(args: {
  sessionId: string;
  visitorId: string | null;
  params: ReturnType<typeof calculateParamsSchema.parse>;
  result: ReturnType<typeof calculate>;
  profileType: string;
  profileSignals: ReturnType<typeof deriveProfileSignals>;
  topPartner: { id: string; slug: string; score: number; reasons: string[] } | null;
}) {
  const {
    sessionId,
    visitorId,
    params,
    result,
    profileType,
    profileSignals,
    topPartner,
  } = args;

  if (!sessionId || sessionId.startsWith("local-")) return;

    const simulation = await prisma.simulation.create({
    data: {
      sessionId,
      params: sanitizeCalculationParams(params) as Prisma.InputJsonValue,
      gross: result.gross,
      net: result.net,
      effectiveRate: result.effectiveTaxRate,
      profileType,
      profileSignals: profileSignals as unknown as Prisma.InputJsonValue,
      matchedPartnerId: topPartner?.id,
      partnerScore: topPartner?.score,
    },
    select: { id: true },
  });

  const existingSession = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { visitorId: true },
  });
  const resolvedVisitorId = visitorId || existingSession?.visitorId || null;

  await prisma.session.updateMany({
    where: { id: sessionId },
    data: {
        lastActiveAt: new Date(),
        profileType,
        profileSignals: profileSignals as unknown as Prisma.InputJsonValue,
        recommendedPartnerId: topPartner?.id ?? null,
        ...(resolvedVisitorId ? { visitorId: resolvedVisitorId } : {}),
      },
  });

  if (resolvedVisitorId) {
    await prisma.visitor.upsert({
      where: { id: resolvedVisitorId },
        create: {
          id: resolvedVisitorId,
          profileType,
          profileSignals: profileSignals as unknown as Prisma.InputJsonValue,
          preferredPartnerId: topPartner?.id,
        },
        update: {
          profileType,
          profileSignals: profileSignals as unknown as Prisma.InputJsonValue,
          ...(topPartner?.id ? { preferredPartnerId: topPartner.id } : {}),
        },
      });
  }

  if (topPartner?.id) {
    await prisma.partnerMatch.create({
      data: {
        sessionId,
        simulationId: simulation.id,
        visitorId: resolvedVisitorId ?? undefined,
        tenantId: topPartner.id,
        profileType,
        score: topPartner.score,
        reason: topPartner.reasons.join(", ") || null,
      },
    });
  }

  await prisma.event.create({
    data: {
      sessionId,
      type: "calculate",
      payload: {
        grossSalary: result.gross,
        netSalary: result.net,
        effectiveTaxRate: result.effectiveTaxRate,
        profileType,
        matchedPartnerSlug: topPartner?.slug ?? null,
        province: params.provincie,
      },
    },
  });

  const recentSims = await prisma.simulation.findMany({
    where: {
      sessionId,
      createdAt: { gte: new Date(Date.now() - 3 * 60 * 1000) },
    },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true, gross: true, params: true },
  });

  const points = recentSims.map((s) => ({
    timestamp: s.createdAt.getTime(),
    gross: s.gross ?? undefined,
    params: (s.params && typeof s.params === "object") ? (s.params as Record<string, unknown>) : undefined,
  }));

  const pattern = detectPattern(points);
  if (pattern && pattern !== "normal") {
    const latestPatternEvent = await prisma.event.findFirst({
      where: {
        sessionId,
        type: "pattern_detected",
        createdAt: { gte: new Date(Date.now() - 90 * 1000) },
      },
      orderBy: { createdAt: "desc" },
      select: { payload: true },
    });

    const latestType =
      latestPatternEvent?.payload &&
      typeof latestPatternEvent.payload === "object" &&
      "type" in (latestPatternEvent.payload as Record<string, unknown>)
        ? String((latestPatternEvent.payload as Record<string, unknown>).type)
        : null;

    if (latestType !== pattern) {
      await prisma.event.create({
        data: {
          sessionId,
          type: "pattern_detected",
          payload: {
            type: pattern,
            trigger: "calculation_flow",
            salary: result.gross,
          },
        },
      });
    }
  }
}

async function postHandler(request: NextRequest) {
  try {
    const identifier = getIdentifier(request);
    const { success: rateOk } = await rateLimitCalculate(identifier);
    if (!rateOk) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = calculateParamsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid params", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const params = parsed.data;
    const result = calculate(params);
    const employerCost = computeEmployerCosts(result.gross);

    const profileSignals = deriveProfileSignals(params, result.gross, result.net);
    const profileType = deriveProfileType(profileSignals);

    let rankedPartners: ReturnType<typeof rankPartnersForProfile> = [];
    try {
      const partnerCandidates = await prisma.tenant.findMany({
        where: { isActive: true, showOnPartnerPage: true },
        orderBy: [{ partnerPageOrder: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          slug: true,
          name: true,
          partnerTier: true,
          partnerDescription: true,
          showOnPartnerPage: true,
          isActive: true,
          partnerPageOrder: true,
          customConfig: true,
        },
      });
      rankedPartners = rankPartnersForProfile(partnerCandidates, profileType, profileSignals).slice(0, 5);
    } catch (e) {
      console.warn("[calculate] partner ranking unavailable:", (e as Error).message);
      rankedPartners = [];
    }

    const topPartner = rankedPartners[0] || null;

    const sessionId = typeof body.sessionId === "string" ? body.sessionId : null;
    const visitorId = sanitizeVisitorId(body.visitorId);

    if (sessionId) {
      await persistCalculationContext({
        sessionId,
        visitorId,
        params,
        result,
        profileType,
        profileSignals,
        topPartner,
      }).catch((err) =>
        console.error("[calculate] persist context error", err)
      );
    }

    return NextResponse.json({
      net: result.net,
      gross: result.gross,
      effectiveTaxRate: result.effectiveTaxRate,
      breakdown: result.breakdown,
      profileType,
      matchedPartner: topPartner
        ? {
            id: topPartner.id,
            slug: topPartner.slug,
            name: topPartner.name,
            score: topPartner.score,
            reasons: topPartner.reasons,
          }
        : null,
      recommendedPartners: rankedPartners.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        tier: p.tier,
        score: p.score,
        reasons: p.reasons,
      })),
      employerCost: {
        grossSalary: employerCost.grossSalary,
        totalEmployerCost: employerCost.totalEmployerCost,
        vacationPay: employerCost.vacationPay,
        wia: employerCost.wia,
        waoUv: employerCost.waoUv,
        zw: employerCost.zw,
      },
    });
  } catch (e) {
    console.error("[calculate] error", e);
    return NextResponse.json({ error: "Calculation failed" }, { status: 500 });
  }
}

export const POST = withApiLog(postHandler);
