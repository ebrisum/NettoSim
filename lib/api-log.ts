import { NextRequest, NextResponse } from "next/server";
import { prisma } from "lib/db";
import { hashForStorage } from "lib/hash";

function getIpHash(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  const real = request.headers.get("x-real-ip");
  const ip = (forwarded?.split(",")[0]?.trim() || real || "").trim();
  if (!ip) return null;
  return hashForStorage(ip);
}

export function logApiCall(
  request: NextRequest,
  response: NextResponse,
  responseMs: number,
  tenantId?: string | null
): void {
  const endpoint = request.nextUrl?.pathname || "/api/v1/unknown";
  const method = request.method || "GET";
  const statusCode = response?.status || 0;
  const ipHash = getIpHash(request);

  prisma.apiLog
    .create({
      data: {
        endpoint,
        method,
        statusCode,
        responseMs,
        tenantId: tenantId ?? null,
        ipHash,
      },
    })
    .catch((err) => console.error("[api-log]", err));
}

export const TENANT_ID_HEADER = "X-Tenant-Id";

export function withApiLog(
  handler: (request: NextRequest) => Promise<NextResponse>,
  getTenantId?: (request: NextRequest, response: NextResponse) => string | null
) {
  return async (request: NextRequest) => {
    const start = Date.now();
    const response = await handler(request);
    const tenantId = getTenantId?.(request, response) ?? response?.headers?.get(TENANT_ID_HEADER) ?? null;
    logApiCall(request, response, Date.now() - start, tenantId);
    return response;
  };
}
