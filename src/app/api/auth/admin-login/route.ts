import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword, HttpError } from "@/lib/auth";
import { handler, json } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) });

/** Owner-only sign-in. Only accounts with the ADMIN role can get a session here. */
export const POST = handler(async (req: Request) => {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const body = Body.parse(await req.json());
  if (!rateLimit(`admin-login:${ip}`, 10, 15 * 60 * 1000) || !rateLimit(`admin-login:${body.email}`, 5, 15 * 60 * 1000)) {
    throw new HttpError(429, "Too many attempts. Please wait 15 minutes.");
  }
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  const ok = user && user.role === "ADMIN" && user.status === "ACTIVE" && (await verifyPassword(body.password, user.passwordHash));
  // One generic error for unknown email, wrong password and non-admin accounts.
  if (!ok) throw new HttpError(401, "Incorrect login or password.");
  await createSession(user.id, h.get("user-agent"));
  return json({ ok: true });
});
