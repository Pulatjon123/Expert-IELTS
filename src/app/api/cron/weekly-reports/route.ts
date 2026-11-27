import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/auth";
import { handler, json } from "@/lib/api";
import { ensureWeeklyReports } from "@/lib/reports";

export const maxDuration = 300;

/**
 * Scheduled job (e.g. Vercel Cron every Monday): creates last week's report for every recently active student.
 * Protected by CRON_SECRET (sent as "Authorization: Bearer <secret>"). Reports are also created on demand when students visit.
 */
export const GET = handler(async (req: Request) => {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) throw new HttpError(401, "Unauthorized.");
  const users = await prisma.user.findMany({ where: { status: "ACTIVE", lastActiveAt: { gte: new Date(Date.now() - 30 * 864e5) } }, select: { id: true } });
  for (const u of users) await ensureWeeklyReports(u.id);
  return json({ ok: true, students: users.length });
});
