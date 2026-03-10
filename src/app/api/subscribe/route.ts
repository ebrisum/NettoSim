import { NextRequest, NextResponse } from "next/server";
import { prisma } from "lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const source = typeof body.source === "string" ? body.source : "signup_form";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    await prisma.subscriber.upsert({
      where: { email },
      create: { email, source, isActive: true },
      update: { isActive: true },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[subscribe]", e);
    return NextResponse.json({ error: "Subscription failed" }, { status: 500 });
  }
}
