import { NextRequest, NextResponse } from "next/server";
import { prisma } from "lib/db";
import { hashForStorage } from "lib/hash";
import { randomBytes } from "crypto";
import { withApiLog } from "lib/api-log";

function getIpHash(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  const real = request.headers.get("x-real-ip");
  const ip = (forwarded?.split(",")[0]?.trim() || real || "").trim();
  if (!ip) return null;
  return hashForStorage(ip);
}

function fallbackSessionId(): string {
  return "local-" + randomBytes(12).toString("hex");
}

function createVisitorId(): string {
  return "v_" + randomBytes(12).toString("hex");
}

function sanitizeVisitorId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!/^v_[a-zA-Z0-9_-]{8,72}$/.test(v)) return null;
  return v;
}

function sanitizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v ? v : null;
}

function sanitizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

async function postHandler(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const fingerprint = sanitizeString(body.fingerprint);
    const referrer = sanitizeString(body.referrer);
    const tenantSlug = sanitizeString(body.tenantSlug);
    const profileType = sanitizeString(body.profileType);
    const profileSignals = body.profileSignals && typeof body.profileSignals === "object" ? body.profileSignals : undefined;
    const suppliedVisitorId = sanitizeVisitorId(body.visitorId);
    const visitorId = suppliedVisitorId || createVisitorId();

    const supabaseUserId = sanitizeString(body.supabaseUserId);
    const email = sanitizeEmail(body.email);
    const userAgent = request.headers.get("user-agent") ?? null;
    const ipHash = getIpHash(request);

    try {
      const tenant = tenantSlug
        ? await prisma.tenant.findUnique({ where: { slug: tenantSlug }, select: { id: true } })
        : null;

      await prisma.visitor.upsert({
        where: { id: visitorId },
        create: {
          id: visitorId,
          totalSessions: 1,
          profileType: profileType || "unknown",
          profileSignals,
        },
        update: {
          totalSessions: { increment: 1 },
          ...(profileType ? { profileType } : {}),
          ...(profileSignals ? { profileSignals } : {}),
        },
      });

      let appUserId: string | undefined;
      if (supabaseUserId && email) {
        const appUser = await prisma.appUser.upsert({
          where: { supabaseUserId },
          create: {
            supabaseUserId,
            email,
            visitorId,
          },
          update: {
            email,
            visitorId,
          },
          select: { id: true },
        });
        appUserId = appUser.id;
      }

      const session = await prisma.session.create({
        data: {
          ipHash: ipHash ?? undefined,
          fingerprintHash: fingerprint ? hashForStorage(fingerprint) : undefined,
          referrer: referrer ?? undefined,
          userAgent,
          tenantId: tenant?.id,
          visitorId,
          appUserId,
          profileType: profileType ?? undefined,
          profileSignals: profileSignals ?? undefined,
        },
      });

      return NextResponse.json({ sessionId: session.id, visitorId });
    } catch (dbError) {
      console.warn("[session] DB unavailable, using fallback:", (dbError as Error).message);
      return NextResponse.json({ sessionId: fallbackSessionId(), visitorId });
    }
  } catch (e) {
    console.error("[session] error", e);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}

export const POST = withApiLog(postHandler);
