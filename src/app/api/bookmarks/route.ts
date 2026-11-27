import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handler, json } from "@/lib/api";

/** Toggle a bookmark on a Writing question or Speaking topic. */
export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const { skill, questionId } = z.object({ skill: z.enum(["WRITING", "SPEAKING"]), questionId: z.string().min(1).max(40) }).parse(await req.json());
  const key = { userId_skill_questionId: { userId: user.id, skill, questionId } };
  const existing = await prisma.bookmark.findUnique({ where: key });
  if (existing) {
    await prisma.bookmark.delete({ where: key });
    return json({ bookmarked: false });
  }
  await prisma.bookmark.create({ data: { userId: user.id, skill, questionId } });
  return json({ bookmarked: true });
});
