import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { handler, json } from "@/lib/api";
import { getOrCreateWritingPrep } from "@/lib/writing-service";

export const maxDuration = 300;

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const { questionId } = z.object({ questionId: z.string().min(1).max(40) }).parse(await req.json());
  return json(await getOrCreateWritingPrep(questionId, user.id));
});
