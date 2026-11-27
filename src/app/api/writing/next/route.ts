import { z } from "zod";
import { getCurrentUser, HttpError } from "@/lib/auth";
import { handler, json } from "@/lib/api";
import { pickWritingQuestion } from "@/lib/writing-service";

export const GET = handler(async (req: Request) => {
  const url = new URL(req.url);
  const q = z
    .object({ task: z.enum(["TASK1", "TASK2"]), category: z.string().max(40).optional(), exclude: z.string().max(40).optional() })
    .parse(Object.fromEntries(url.searchParams));
  const user = await getCurrentUser();
  const id = await pickWritingQuestion(user?.id ?? null, q.task, q.category || undefined, q.exclude);
  if (!id) throw new HttpError(404, "No questions of this type yet.");
  return json({ questionId: id });
});
