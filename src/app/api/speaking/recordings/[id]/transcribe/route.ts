import { prisma } from "@/lib/db";
import { requireUser, HttpError } from "@/lib/auth";
import { handler, json } from "@/lib/api";
import { transcribeRecording } from "@/lib/speaking-service";

export const maxDuration = 180;

/** Retry transcription for a recording (e.g. after the STT service was configured or a temporary error). */
export const POST = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;
  const rec = await prisma.speakingRecording.findFirst({ where: { id, session: { userId: user.id } }, select: { id: true } });
  if (!rec) throw new HttpError(404, "Recording not found.");
  await transcribeRecording(id, user.id);
  return json({ ok: true });
});
