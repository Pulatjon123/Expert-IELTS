import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { handler, json } from "@/lib/api";

export const POST = handler(async (req: Request) => {
  const { locale } = z.object({ locale: z.enum(["en", "uz"]) }).parse(await req.json());
  const user = await getCurrentUser();
  if (user) await prisma.user.update({ where: { id: user.id }, data: { locale } });
  return json({ ok: true });
});
