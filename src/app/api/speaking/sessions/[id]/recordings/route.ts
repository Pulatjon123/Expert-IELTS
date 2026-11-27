import { z } from "zod";
import { requireUser, HttpError } from "@/lib/auth";
import { handler, json } from "@/lib/api";
import { MAX_AUDIO_BYTES, saveRecording } from "@/lib/speaking-service";

export const maxDuration = 180;

const Fields = z.object({
  attempt: z.coerce.number().int().min(1).max(2),
  questionIndex: z.coerce.number().int().min(0).max(30),
});

/** Upload one answer (16 kHz mono WAV). Re-uploading the same question/attempt replaces the earlier take. */
export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_AUDIO_BYTES + 100_000) throw new HttpError(413, "Recording is too large.");
  const form = await req.formData();
  const file = form.get("audio");
  if (!(file instanceof Blob)) throw new HttpError(400, "No audio received.");
  const fields = Fields.parse({ attempt: form.get("attempt"), questionIndex: form.get("questionIndex") });
  const audio = Buffer.from(await file.arrayBuffer());
  const result = await saveRecording({ sessionId: id, userId: user.id, ...fields, audio });
  return json({ recordingId: result.recording.id, transcriptionError: result.transcriptionError ?? null });
});
