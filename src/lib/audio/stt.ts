import "server-only";
import { prisma } from "../db";
import { AiNotConfiguredError } from "../ai/errors";
import { isSttConfigured } from "../ai/services";

export interface SttWord {
  word: string;
  start: number;
  end: number;
}
export interface SttSegment {
  start: number;
  end: number;
  text: string;
  avgLogprob?: number;
  noSpeechProb?: number;
}
export interface SttResult {
  text: string;
  segments: SttSegment[];
  words: SttWord[];
  provider: string;
}

// Biases Whisper towards verbatim output (keeping fillers and false starts) instead of "cleaning up" speech.
// It does not change what the student said; it only discourages the model from silently removing hesitations.
const VERBATIM_PROMPT = "Umm, let me think, like, hmm... Okay, so, uh, I I think that, you know, it's- it's quite important.";

/**
 * Transcribe audio with any OpenAI-compatible Whisper endpoint (Groq, OpenAI, or a self-hosted faster-whisper server).
 * The returned text is stored exactly as received and is never edited afterwards.
 */
export async function transcribe(audio: Buffer, filename: string, userId: string): Promise<SttResult> {
  if (!isSttConfigured()) throw new AiNotConfiguredError("Speech-to-text (STT_API_URL / STT_API_KEY)");
  const base = process.env.STT_API_URL!.replace(/\/$/, "");
  const model = process.env.STT_MODEL || "whisper-large-v3";
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(audio)], { type: "audio/wav" }), filename);
  form.append("model", model);
  form.append("language", "en");
  form.append("temperature", "0");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");
  form.append("timestamp_granularities[]", "segment");
  form.append("prompt", VERBATIM_PROMPT);

  let ok = false;
  let error: string | undefined;
  let duration = 0;
  try {
    const res = await fetch(`${base}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.STT_API_KEY}` },
      body: form,
      signal: AbortSignal.timeout(120_000),
    });
    if (res.status === 401 || res.status === 403) throw new AiNotConfiguredError("Speech-to-text", "The speech-to-text API key was rejected.");
    if (!res.ok) throw new Error(`Transcription failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as {
      text: string;
      duration?: number;
      segments?: { start: number; end: number; text: string; avg_logprob?: number; no_speech_prob?: number }[];
      words?: { word: string; start: number; end: number }[];
    };
    duration = data.duration ?? 0;
    ok = true;
    return {
      text: (data.text ?? "").trim(),
      segments: (data.segments ?? []).map((s) => ({ start: s.start, end: s.end, text: s.text.trim(), avgLogprob: s.avg_logprob, noSpeechProb: s.no_speech_prob })),
      words: (data.words ?? []).map((w) => ({ word: w.word.trim(), start: w.start, end: w.end })),
      provider: `${new URL(base).hostname}/${model}`,
    };
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    throw e;
  } finally {
    await prisma.aiUsageLog
      .create({
        data: {
          userId,
          feature: "speech_to_text",
          provider: "stt",
          model,
          audioSeconds: duration,
          success: ok,
          error: error?.slice(0, 500),
        },
      })
      .catch(() => {});
  }
}
