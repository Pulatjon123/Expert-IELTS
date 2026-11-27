import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, HttpError } from "@/lib/auth";
import { handler, json } from "@/lib/api";

/** Start a practice session (first attempt → preparation → second attempt) for one question set. */
export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const { topicId } = z.object({ topicId: z.string().min(1).max(40) }).parse(await req.json());
  const topic = await prisma.speakingTopic.findFirst({ where: { id: topicId, isActive: true } });
  if (!topic) throw new HttpError(404, "Question set not found.");
  const session = await prisma.speakingSession.create({ data: { userId: user.id, topicId, mode: "PRACTICE", part: topic.part } });
  return json({ sessionId: session.id }, { status: 201 });
});
