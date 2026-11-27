import { requireUser } from "@/lib/auth";
import { handler, json } from "@/lib/api";
import { advanceInterview } from "@/lib/interview-service";

export const maxDuration = 180;

/** The examiner "listens" to the latest answer (transcribed) and asks the next question. */
export const POST = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;
  const state = await advanceInterview(id, user.id);
  return json({ phase: state.phase, turns: state.turns.length });
});
