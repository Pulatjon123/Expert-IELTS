import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handler, json } from "@/lib/api";
import { SpeakingTopicInput } from "@/lib/validators";

export const GET = handler(async () => {
  await requireAdmin();
  const items = await prisma.speakingTopic.findMany({ orderBy: [{ part: "asc" }, { createdAt: "desc" }], include: { _count: { select: { sessions: true } } } });
  return json({ items });
});

export const POST = handler(async (req: Request) => {
  await requireAdmin();
  const data = SpeakingTopicInput.parse(await req.json());
  const item = await prisma.speakingTopic.create({ data });
  return json({ item }, { status: 201 });
});
