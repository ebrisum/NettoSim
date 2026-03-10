import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "lib/db";
import { requireAppUser } from "lib/auth-user";

function sanitizeLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().slice(0, 120);
  return v || null;
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAppUser(request);
  if (error || !user) {
    return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.savedScenario.findFirst({
    where: { id, appUserId: user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const label = sanitizeLabel(body.label);
  const current = asObject(body.current);
  const proposed = asObject(body.proposed);
  const isPinned = typeof body.isPinned === "boolean" ? body.isPinned : undefined;
  const currentJson = current
    ? (current as unknown as Prisma.InputJsonValue)
    : undefined;
  const proposedJson = proposed
    ? (proposed as unknown as Prisma.InputJsonValue)
    : undefined;

  if (isPinned === true) {
    await prisma.savedScenario.updateMany({
      where: { appUserId: user.id, isPinned: true, id: { not: id } },
      data: { isPinned: false },
    });
  }

  const scenario = await prisma.savedScenario.update({
    where: { id },
    data: {
      ...(label != null ? { label } : {}),
      ...(currentJson ? { current: currentJson } : {}),
      ...(proposedJson ? { proposed: proposedJson } : {}),
      ...(typeof isPinned === "boolean" ? { isPinned } : {}),
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

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAppUser(request);
  if (error || !user) {
    return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.savedScenario.findFirst({
    where: { id, appUserId: user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  await prisma.savedScenario.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
