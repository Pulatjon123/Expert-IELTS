import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, HttpError } from "@/lib/auth";
import { handler, json } from "@/lib/api";
import { getOrCreateSpeakingPrep } from "@/lib/speaking-service";

export const maxDuration = 300;

/** Preparation unlocks only after the student has recorded their own first attempt in this session. */
export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const { sessionId } = z.object({ sessionId: z.string().min(1).max(40) }).parse(await req.json());
  const s = await prisma.speakingSession.findFirst({ where: { id: sessionId, userId: user.id }, select: { topicId: true, _count: { select: { recordings: { where: { attempt: 1 } } } } } });
  if (!s?.topicId) throw new HttpError(404, "Speaking session not found.");
  if (!s._count.recordings) throw new HttpError(400, "Record your first attempt before opening the preparation.");
  return json(await getOrCreateSpeakingPrep(s.topicId, user.id));
});
