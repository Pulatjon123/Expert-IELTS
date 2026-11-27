import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { handler, json } from "@/lib/api";
import { assessAttempt } from "@/lib/speaking-service";

export const maxDuration = 300;

export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;
  const { attempt } = z.object({ attempt: z.number().int().min(1).max(2) }).parse(await req.json());
  const a = await assessAttempt(id, user.id, attempt);
  return json({ ok: true, overallBand: a.overallBand });
});
