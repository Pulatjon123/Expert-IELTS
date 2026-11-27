import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handler, json } from "@/lib/api";
import { WritingQuestionInput } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = handler(async (req: Request, { params }: Ctx) => {
  await requireAdmin();
  const { id } = await params;
  const data = WritingQuestionInput.parse(await req.json());
  // The question was deleted while its edit form was still open: save the form as a new question instead of failing.
  if (!(await prisma.writingQuestion.findUnique({ where: { id }, select: { id: true } }))) {
    const created = await prisma.writingQuestion.create({ data: { ...data, imageUrl: data.imageUrl || null, visual: data.visual ?? undefined } });
    return json({ item: created, createdInstead: true }, { status: 201 });
  }
  const item = await prisma.writingQuestion.update({
    where: { id },
    data: { ...data, imageUrl: data.imageUrl || null, visual: data.visual ?? undefined },
  });
  // Question text changed -> cached AI preparation may no longer match.
  await prisma.writingPrep.deleteMany({ where: { questionId: id } });
  await prisma.bandComparison.deleteMany({ where: { skill: "WRITING", questionId: id } });
  return json({ item });
});

export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  await requireAdmin();
  const { id } = await params;
  await prisma.writingQuestion.delete({ where: { id } });
  return json({ ok: true });
});
