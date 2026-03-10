import { NextRequest, NextResponse } from "next/server";
import { prisma } from "lib/db";
import { getSupabaseAdmin } from "lib/supabase/server";

function parseBearerToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

function sanitizeVisitorId(value: string | null): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!/^v_[a-zA-Z0-9_-]{8,72}$/.test(v)) return null;
  return v;
}

export type AuthenticatedAppUser = {
  id: string;
  supabaseUserId: string;
  email: string;
  displayName: string | null;
  visitorId: string | null;
};

export async function requireAppUser(
  request: NextRequest
): Promise<{ error: NextResponse | null; user: AuthenticatedAppUser | null }> {
  const token = parseBearerToken(request);
  if (!token) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      user: null,
    };
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error: authError } = await supabaseAdmin.auth.getUser(token);
  const authUser = data?.user;
  if (authError || !authUser?.id || !authUser.email) {
    return {
      error: NextResponse.json({ error: "Invalid token" }, { status: 401 }),
      user: null,
    };
  }

  const displayName =
    typeof authUser.user_metadata?.full_name === "string"
      ? authUser.user_metadata.full_name.trim() || null
      : null;
  const visitorId = sanitizeVisitorId(request.headers.get("x-visitor-id"));

  const user = await prisma.appUser.upsert({
    where: { supabaseUserId: authUser.id },
    create: {
      supabaseUserId: authUser.id,
      email: authUser.email,
      displayName,
      visitorId,
    },
    update: {
      email: authUser.email,
      displayName,
      ...(visitorId ? { visitorId } : {}),
    },
    select: {
      id: true,
      supabaseUserId: true,
      email: true,
      displayName: true,
      visitorId: true,
    },
  });

  if (visitorId) {
    await prisma.visitor
      .upsert({
        where: { id: visitorId },
        create: {
          id: visitorId,
          totalSessions: 0,
          profileType: "unknown",
        },
        update: {},
      })
      .catch(() => null);
  }

  return { error: null, user };
}



