import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handler, json } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  await requireAdmin();
  const { id } = await params;
  const { active } = z.object({ active: z.boolean() }).parse(await req.json());
  return json({ item: await prisma.announcement.update({ where: { id }, data: { active } }) });
});

export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  await requireAdmin();
  const { id } = await params;
  await prisma.announcement.delete({ where: { id } });
  return json({ ok: true });
});
