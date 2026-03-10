import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "lib/admin-api";
import { prisma } from "lib/db";

export async function GET(request: NextRequest) {
  const unauth = await verifyAdmin(request);
  if (unauth) return unauth;

  try {
    const subscribers = await prisma.subscriber.findMany({
      orderBy: { subscribedAt: "desc" },
    });

    const lines: string[] = ["email,source,tags,isActive,subscribedAt"];
    for (const s of subscribers) {
      const tags = Array.isArray(s.tags) ? s.tags.join(";") : "";
      lines.push([s.email, s.source, tags, String(s.isActive), s.subscribedAt.toISOString()].join(","));
    }

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=subscribers.csv",
      },
    });
  } catch (e) {
    console.error("[admin/emails/subscribers/export]", e);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
