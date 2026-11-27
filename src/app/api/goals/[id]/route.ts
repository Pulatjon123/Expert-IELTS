import { z } from "zod";
import { prisma } from "@/lib/db";
import { HttpError, requireUser } from "@/lib/auth";
import { handler, json } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const { done } = z.object({ done: z.boolean() }).parse(await req.json());
  const { count } = await prisma.learningGoal.updateMany({ where: { id, userId: user.id }, data: { done } });
  if (!count) throw new HttpError(404, "Goal not found.");
  return json({ ok: true });
});

export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const { count } = await prisma.learningGoal.deleteMany({ where: { id, userId: user.id } });
  if (!count) throw new HttpError(404, "Goal not found.");
  return json({ ok: true });
});
