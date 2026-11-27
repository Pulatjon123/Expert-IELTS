import { z } from "zod";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { HttpError, hashPassword, requireUser, SESSION_COOKIE, verifyPassword } from "@/lib/auth";
import { handler, json } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  if (!rateLimit(`pw:${user.id}`, 10, 15 * 60 * 1000)) throw new HttpError(429, "Too many attempts. Try again later.");
  const { current, next } = z.object({ current: z.string().min(1), next: z.string().min(8).max(200) }).parse(await req.json());
  const full = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(current, full.passwordHash))) throw new HttpError(403, "Your current password is incorrect.");
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  // Sign out every other device; keep this session.
  const token = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
  const keep = createHash("sha256").update(token).digest("hex");
  await prisma.session.deleteMany({ where: { userId: user.id, id: { not: keep } } });
  return json({ ok: true });
});
