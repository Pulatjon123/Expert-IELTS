import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handler, json } from "@/lib/api";
import { SpeakingTopicInput } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = handler(async (req: Request, { params }: Ctx) => {
  await requireAdmin();
  const { id } = await params;
  const data = SpeakingTopicInput.parse(await req.json());
  const item = await prisma.speakingTopic.update({ where: { id }, data });
  await prisma.speakingPrep.deleteMany({ where: { topicId: id } });
  await prisma.bandComparison.deleteMany({ where: { skill: "SPEAKING", questionId: id } });
  return json({ item });
});

export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  await requireAdmin();
  const { id } = await params;
  await prisma.speakingTopic.delete({ where: { id } });
  return json({ ok: true });
});
