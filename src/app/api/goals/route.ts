import { z } from "zod";
import { prisma } from "@/lib/db";
import { HttpError, requireUser } from "@/lib/auth";
import { handler, json } from "@/lib/api";

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const data = z.object({ title: z.string().trim().min(2).max(200), targetDate: z.coerce.date().nullable().optional() }).parse(await req.json());
  if ((await prisma.learningGoal.count({ where: { userId: user.id } })) >= 50) throw new HttpError(400, "You can keep up to 50 goals.");
  return json({ goal: await prisma.learningGoal.create({ data: { ...data, userId: user.id } }) }, { status: 201 });
});
