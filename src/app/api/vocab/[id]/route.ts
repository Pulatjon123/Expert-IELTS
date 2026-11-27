import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, HttpError } from "@/lib/auth";
import { handler, json } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

const Patch = z.object({
  learned: z.boolean().optional(),
  uzbek: z.string().trim().max(300).nullable().optional(),
  definition: z.string().trim().max(600).nullable().optional(),
  example: z.string().trim().max(600).nullable().optional(),
  topic: z.string().trim().max(80).nullable().optional(),
});

export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const data = Patch.parse(await req.json());
  const { count } = await prisma.vocabItem.updateMany({ where: { id, userId: user.id }, data });
  if (!count) throw new HttpError(404, "Expression not found.");
  return json({ ok: true });
});

export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const { count } = await prisma.vocabItem.deleteMany({ where: { id, userId: user.id } });
  if (!count) throw new HttpError(404, "Expression not found.");
  return json({ ok: true });
});
