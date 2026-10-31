import "server-only";

import { timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

/** Scheduled jobs must send "Authorization: Bearer <CRON_SECRET>" (Vercel Cron does). */
export function cronAuthorized(request: Request): boolean {
  const secret = env().CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
