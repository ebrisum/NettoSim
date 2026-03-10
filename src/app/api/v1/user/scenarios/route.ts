import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "lib/db";
import { requireAppUser } from "lib/auth-user";

function sanitizeLabel(value: unknown): string {
  if (typeof value !== "string") return "Saved scenario";
  const v = value.trim().slice(0, 120);
  return v || "Saved scenario";
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export async function GET(request: NextRequest) {
  const { error, user } = await requireAppUser(request);
  if (error || !user) {
    return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(request.nextUrl.searchParams.get("limit") || "10", 10) || 10)
  );

  const scenarios = await prisma.savedScenario.findMany({
    where: { appUserId: user.id },
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });

  return NextResponse.json({
    scenarios: scenarios.map((s) => ({
      id: s.id,
      label: s.label,
      current: s.current,
      proposed: s.proposed,
      isPinned: s.isPinned,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireAppUser(request);
  if (error || !user) {
    return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const label = sanitizeLabel(body.label);
  const current = asObject(body.current);
  const proposed = asObject(body.proposed);
  const isPinned = body.isPinned === true;

  if (!current || !proposed) {
    return NextResponse.json(
      { error: "Both current and proposed scenarios are required." },
      { status: 400 }
    );
  }

  if (isPinned) {
    await prisma.savedScenario.updateMany({
      where: { appUserId: user.id, isPinned: true },
      data: { isPinned: false },
    });
  }

  const scenario = await prisma.savedScenario.create({
    data: {
      appUserId: user.id,
      label,
      current: current as unknown as Prisma.InputJsonValue,
      proposed: proposed as unknown as Prisma.InputJsonValue,
      isPinned,
    },
  });

  return NextResponse.json({
    scenario: {
      id: scenario.id,
      label: scenario.label,
      current: scenario.current,
      proposed: scenario.proposed,
      isPinned: scenario.isPinned,
      createdAt: scenario.createdAt.toISOString(),
      updatedAt: scenario.updatedAt.toISOString(),
    },
  });
}
