import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "lib/admin-auth";

/**
 * Call at the start of every /api/admin/* route. Returns 401 response if not authenticated.
 */
export async function verifyAdmin(
  request: NextRequest
): Promise<NextResponse | null> {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
