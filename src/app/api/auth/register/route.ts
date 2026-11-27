import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { createSession, hashPassword, HttpError } from "@/lib/auth";
import { handler, json } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { getLocale } from "@/lib/i18n/server";

const Body = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8).max(200),
});

export const POST = handler(async (req: Request) => {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`register:${ip}`, 10, 60 * 60 * 1000)) throw new HttpError(429, "Too many sign-ups from this network. Try again later.");
  const body = Body.parse(await req.json());
  const exists = await prisma.user.findUnique({ where: { email: body.email } });
  if (exists) throw new HttpError(409, "An account with this email already exists.");
  const user = await prisma.user.create({
    data: { name: body.name, email: body.email, passwordHash: await hashPassword(body.password), locale: await getLocale() },
  });
  await createSession(user.id, h.get("user-agent"));
  return json({ ok: true });
});
