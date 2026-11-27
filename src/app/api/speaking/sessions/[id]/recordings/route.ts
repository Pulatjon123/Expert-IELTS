import { z } from "zod";
import { requireUser, HttpError } from "@/lib/auth";
import { handler, json } from "@/lib/api";
import { MAX_AUDIO_BYTES, isOwnDirectUploadKey, saveRecording } from "@/lib/speaking-service";
import { readStoredFile } from "@/lib/storage";

export const maxDuration = 180;

const Fields = z.object({
  attempt: z.coerce.number().int().min(1).max(2),
  questionIndex: z.coerce.number().int().min(0).max(30),
});

/**
 * Save one answer (16 kHz mono WAV). Re-uploading the same question/attempt replaces the earlier take.
 * Two ways in: a multipart upload with the audio (local disk), or JSON with the key of a file the browser
 * already uploaded straight to cloud storage (see ../upload-url).
 */
export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;

  if (req.headers.get("content-type")?.includes("application/json")) {
    const body = Fields.extend({ key: z.string().max(200) }).parse(await req.json());
    if (!isOwnDirectUploadKey(body.key, user.id)) throw new HttpError(400, "Invalid upload.");
    const audio = await readStoredFile(body.key).catch(() => {
      throw new HttpError(400, "The recording did not finish uploading. Please try again.");
    });
    const result = await saveRecording({ sessionId: id, userId: user.id, attempt: body.attempt, questionIndex: body.questionIndex, audio, storedKey: body.key });
    return json({ recordingId: result.recording.id, transcriptionError: result.transcriptionError ?? null });
  }

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
