import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "lib/db";
import { requireAppUser } from "lib/auth-user";

function sanitizeString(value: unknown, max = 240): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().slice(0, max);
  return v || null;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
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
  const existing = await prisma.userLifeEvent.findFirst({
    where: { id, appUserId: user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const title = sanitizeString(body.title, 140);
  const description = sanitizeString(body.description, 2000);
  const category = sanitizeString(body.category, 80);
  const eventDate = parseDate(body.eventDate);
  const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : undefined;
  const metadataJson = metadata
    ? (metadata as unknown as Prisma.InputJsonValue)
    : undefined;

  const event = await prisma.userLifeEvent.update({
    where: { id },
    data: {
      ...(title != null ? { title } : {}),
      ...(description != null ? { description } : {}),
      ...(category != null ? { category } : {}),
      ...(eventDate ? { eventDate } : {}),
      ...(metadataJson ? { metadata: metadataJson } : {}),
    },
  });

  return NextResponse.json({
    event: {
      id: event.id,
      title: event.title,
      description: event.description,
      category: event.category,
      eventDate: event.eventDate.toISOString().slice(0, 10),
      metadata: event.metadata,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
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
  const existing = await prisma.userLifeEvent.findFirst({
    where: { id, appUserId: user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  await prisma.userLifeEvent.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
