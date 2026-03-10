import { NextRequest, NextResponse } from "next/server";
import { createAdminToken, setAdminCookie } from "lib/admin-auth";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const RATE_LIMIT: Record<string, number[]> = {};
const RATE_LIMIT_WINDOW = 60_000;
const MAX_ATTEMPTS = 5;

function getClientId(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = (forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown").trim();
  return ip;
}

function isRateLimited(clientId: string): boolean {
  const now = Date.now();
  if (!RATE_LIMIT[clientId]) RATE_LIMIT[clientId] = [];
  const attempts = RATE_LIMIT[clientId].filter((t) => now - t < RATE_LIMIT_WINDOW);
  RATE_LIMIT[clientId] = attempts;
  return attempts.length >= MAX_ATTEMPTS;
}

export async function POST(request: NextRequest) {
  const clientId = getClientId(request);
  if (isRateLimited(clientId)) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again in a minute." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";

  if (!ADMIN_PASSWORD) {
    console.warn("[admin] ADMIN_PASSWORD not set");
    return NextResponse.json(
      { error: "Admin login not configured" },
      { status: 503 }
    );
  }

  if (password !== ADMIN_PASSWORD) {
    RATE_LIMIT[clientId] = [...(RATE_LIMIT[clientId] || []), Date.now()];
    return NextResponse.json(
      { error: "Invalid password" },
      { status: 401 }
    );
  }

  const token = await createAdminToken();
  await setAdminCookie(token);
  return NextResponse.json({ ok: true });
}
