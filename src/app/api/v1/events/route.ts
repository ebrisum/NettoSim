import { NextRequest, NextResponse } from "next/server";
import { prisma } from "lib/db";
import { withApiLog } from "lib/api-log";

function sanitizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v ? v : null;
}

async function postHandler(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionId = sanitizeString(body.sessionId);
    const type = sanitizeString(body.type) || "unknown";
    const payload = body.payload != null ? body.payload : undefined;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    if (sessionId.startsWith("local-")) {
      // Local fallback sessions are intentionally non-persistent.
      return NextResponse.json({ ok: true, persisted: false });
    }

    await prisma.event.create({
      data: {
        sessionId,
        type,
        payload: payload ?? undefined,
      },
    });

    const profileType = sanitizeString((payload as Record<string, unknown> | null)?.profileType);
    const profileSignals =
      payload && typeof payload === "object" && "profileSignals" in payload
        ? (payload as Record<string, unknown>).profileSignals
        : undefined;

    await prisma.session.updateMany({
      where: { id: sessionId },
      data: {
        lastActiveAt: new Date(),
        ...(profileType ? { profileType } : {}),
        ...(profileSignals && typeof profileSignals === "object" ? { profileSignals } : {}),
      },
    });

    return NextResponse.json({ ok: true, persisted: true });
  } catch (e) {
    console.error("[events] error", e);
    return NextResponse.json({ error: "Failed to log event" }, { status: 500 });
  }
}

export const POST = withApiLog(postHandler);
