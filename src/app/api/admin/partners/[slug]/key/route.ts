import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "lib/admin-api";
import { prisma } from "lib/db";
import { hashForStorage } from "lib/hash";
import { randomBytes } from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;

  const { slug } = await params;
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const rawKey = "sk_" + randomBytes(24).toString("hex");
    const apiKeyHash = hashForStorage(rawKey);

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { apiKeyHash },
    });

    return NextResponse.json({
      apiKey: rawKey,
      message: "Save the new API key; it will not be shown again.",
    });
  } catch (e) {
    console.error("[admin/partners/[slug]/key POST]", e);
    return NextResponse.json({ error: "Failed to regenerate key" }, { status: 500 });
  }
}
