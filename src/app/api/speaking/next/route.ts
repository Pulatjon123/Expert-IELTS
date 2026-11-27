import { z } from "zod";
import { requireUser, HttpError } from "@/lib/auth";
import { handler, json } from "@/lib/api";
import { pickSpeakingTopic } from "@/lib/speaking-service";

export const GET = handler(async (req: Request) => {
  const user = await requireUser();
  const q = z
    .object({ part: z.coerce.number().int().min(1).max(3), exclude: z.string().max(40).optional() })
    .parse(Object.fromEntries(new URL(req.url).searchParams));
  const topicId = await pickSpeakingTopic(user.id, q.part, q.exclude);
  if (!topicId) throw new HttpError(404, "No questions for this part yet.");
  return json({ topicId });
});
