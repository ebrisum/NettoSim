import { NextRequest, NextResponse } from "next/server";
import { prisma } from "lib/db";

function sanitizeString(value: unknown, max = 5000): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function sanitizeEmail(value: unknown): string {
  if (typeof value !== "string") return "";
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "";
  return email;
}

function sanitizeVisitorId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return /^v_[a-zA-Z0-9_-]{8,72}$/.test(v) ? v : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const name = sanitizeString(body.name, 120);
    const email = sanitizeEmail(body.email);
    const subject = sanitizeString(body.subject, 180);
    const message = sanitizeString(body.message, 10000);

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "Name, email, subject, and message are required." },
        { status: 400 }
      );
    }

    const source = sanitizeString(body.source, 64) || "contact_form";
    const status = "new";
    const sessionId = sanitizeString(body.sessionId, 64) || null;
    const visitorId = sanitizeVisitorId(body.visitorId);
    const profileType = sanitizeString(body.profileType, 64) || null;
    const profileSignals =
      body.profileSignals && typeof body.profileSignals === "object"
        ? body.profileSignals
        : undefined;
    const metadata =
      body.metadata && typeof body.metadata === "object" ? body.metadata : undefined;
    const subscribe = body.subscribe !== false;

    const partnerSlug = sanitizeString(body.partnerSlug, 120);
    const partner = partnerSlug
      ? await prisma.tenant.findUnique({ where: { slug: partnerSlug }, select: { id: true } })
      : null;

    await prisma.contactLead.create({
      data: {
        name,
        email,
        subject,
        message,
        source,
        status,
        sessionId: sessionId || undefined,
        visitorId: visitorId || undefined,
        partnerId: partner?.id,
        profileType: profileType || undefined,
        profileSignals: profileSignals ?? undefined,
        metadata: metadata ?? undefined,
      },
    });

    if (subscribe) {
      await prisma.subscriber.upsert({
        where: { email },
        create: {
          email,
          source: source === "contact_form" ? "contact" : source,
          isActive: true,
          metadata: {
            latestSubject: subject,
            latestSource: source,
          },
        },
        update: {
          isActive: true,
          source: source === "contact_form" ? "contact" : source,
          metadata: {
            latestSubject: subject,
            latestSource: source,
          },
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[contact]", e);
    return NextResponse.json({ error: "Failed to submit contact form" }, { status: 500 });
  }
}
