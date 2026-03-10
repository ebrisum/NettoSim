import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "lib/admin-api";
import { prisma } from "lib/db";

export async function GET(request: NextRequest) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;

  try {
    const settings = await prisma.adminSetting.findMany();
    const map: Record<string, unknown> = {};
    for (const s of settings) map[s.key] = s.value;
    return NextResponse.json({ settings: map });
  } catch (e) {
    console.error("[admin/settings GET]", e);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;

  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    for (const [key, value] of Object.entries(body)) {
      if (typeof key !== "string") continue;
      await prisma.adminSetting.upsert({
        where: { key },
        create: { key, value: value as object },
        update: { value: value as object },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/settings PUT]", e);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
