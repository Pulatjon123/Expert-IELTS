import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, HttpError } from "@/lib/auth";
import { handler, json } from "@/lib/api";

/** Resume the student's open draft for this question, or start a new one. */
export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const { questionId, fresh } = z.object({ questionId: z.string().min(1).max(40), fresh: z.boolean().optional() }).parse(await req.json());
  const q = await prisma.writingQuestion.findUnique({ where: { id: questionId }, select: { id: true } });
  if (!q) throw new HttpError(404, "Question not found.");
  if (!fresh) {
    const open = await prisma.writingAttempt.findFirst({
      where: { userId: user.id, questionId, status: { in: ["DRAFT", "FAILED"] } },
      orderBy: { updatedAt: "desc" },
    });
    if (open) return json({ attempt: open });
  }
  const attempt = await prisma.writingAttempt.create({ data: { userId: user.id, questionId } });
  return json({ attempt }, { status: 201 });
});
