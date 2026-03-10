import { createHash } from "crypto";

/** Hash a string (e.g. IP) for storage. Never store raw IP. */
export function hashForStorage(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
