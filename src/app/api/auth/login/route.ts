import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword, HttpError } from "@/lib/auth";
import { handler, json } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) });

export const POST = handler(async (req: Request) => {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const body = Body.parse(await req.json());
  if (!rateLimit(`login:${ip}`, 20, 15 * 60 * 1000) || !rateLimit(`login:${body.email}`, 8, 15 * 60 * 1000)) {
    throw new HttpError(429, "Too many sign-in attempts. Please wait 15 minutes.");
  }
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  // Same error for unknown email and wrong password.
  if (!user || !(await verifyPassword(body.password, user.passwordHash))) throw new HttpError(401, "Incorrect email or password.");
  if (user.status !== "ACTIVE") throw new HttpError(403, "This account has been suspended. Contact the site owner.");
  await createSession(user.id, h.get("user-agent"));
  return json({ ok: true, role: user.role });
});
