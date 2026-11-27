import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handler, json } from "@/lib/api";
import { WritingQuestionInput } from "@/lib/validators";

export const GET = handler(async () => {
  await requireAdmin();
  const items = await prisma.writingQuestion.findMany({ orderBy: [{ task: "asc" }, { createdAt: "desc" }], include: { _count: { select: { attempts: true } } } });
  return json({ items });
});

export const POST = handler(async (req: Request) => {
  await requireAdmin();
  const data = WritingQuestionInput.parse(await req.json());
  const item = await prisma.writingQuestion.create({ data: { ...data, imageUrl: data.imageUrl || null, visual: data.visual ?? undefined } });
  return json({ item }, { status: 201 });
});
