import "server-only";
import { prisma } from "../db";
import { isPronunciationConfigured } from "../ai/services";
import { splitWav } from "./wav";

export interface PronunciationResult {
  provider: "azure";
  accuracy: number;
  fluency: number;
  prosody: number | null;
  completeness: number | null;
  overall: number;
  /** Words the service scored low on accuracy, with timestamps in the original recording. */
  weakWords: { word: string; accuracy: number; errorType: string; offsetSec: number }[];
  chunks: number;
}

interface AzureWord {
  Word: string;
  Offset?: number;
  PronunciationAssessment?: { AccuracyScore?: number; ErrorType?: string };
}
interface AzureResponse {
  RecognitionStatus: string;
  NBest?: {
    PronunciationAssessment?: { AccuracyScore: number; FluencyScore: number; ProsodyScore?: number; CompletenessScore?: number; PronScore: number };
    Words?: AzureWord[];
  }[];
}

/**
 * Pronunciation assessment from the actual audio, using Azure AI Speech (unscripted assessment, no reference text).
 * The REST short-audio endpoint accepts about 60 s per request, so longer answers are scored in 50 s chunks
 * and averaged by word count. Returns null when the service is not configured — pronunciation is then not assessed.
 */
export async function assessPronunciation(wav: Buffer, userId: string): Promise<PronunciationResult | null> {
  if (!isPronunciationConfigured()) return null;
  const region = process.env.AZURE_SPEECH_REGION!;
  const config = Buffer.from(
    JSON.stringify({ GradingSystem: "HundredMark", Granularity: "Word", Dimension: "Comprehensive", EnableProsodyAssessment: true }),
  ).toString("base64");

  const chunks = splitWav(wav, 50);
  const scored: { words: number; pa: NonNullable<NonNullable<AzureResponse["NBest"]>[number]["PronunciationAssessment"]>; wordsList: AzureWord[]; offsetSec: number }[] = [];
  let seconds = 0;
  let error: string | undefined;
  try {
    for (const c of chunks) {
      seconds += c.wav.length / 32000;
      const res = await fetch(
        `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`,
        {
          method: "POST",
          headers: {
            "Ocp-Apim-Subscription-Key": process.env.AZURE_SPEECH_KEY!,
            "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
            "Pronunciation-Assessment": config,
            Accept: "application/json",
          },
          body: new Uint8Array(c.wav),
          signal: AbortSignal.timeout(60_000),
        },
      );
      if (!res.ok) throw new Error(`Pronunciation service error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as AzureResponse;
      const best = data.NBest?.[0];
      if (data.RecognitionStatus !== "Success" || !best?.PronunciationAssessment) continue;
      scored.push({ words: best.Words?.length ?? 1, pa: best.PronunciationAssessment, wordsList: best.Words ?? [], offsetSec: c.offsetSec });
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  } finally {
    await prisma.aiUsageLog
      .create({ data: { userId, feature: "pronunciation", provider: "azure", model: "azure-pronunciation", audioSeconds: seconds, success: !error, error: error?.slice(0, 500) } })
      .catch(() => {});
  }
  if (error) throw new Error(error);
  if (!scored.length) return null;

  const avg = (f: (s: (typeof scored)[number]) => number | undefined) => {
    const vals = scored.filter((s) => typeof f(s) === "number");
    if (!vals.length) return null;
    const w = vals.reduce((a, s) => a + s.words, 0);
    return Math.round(vals.reduce((a, s) => a + (f(s) as number) * s.words, 0) / w);
  };
  const weakWords = scored
    .flatMap((s) =>
      s.wordsList.map((w) => ({
        word: w.Word,
        accuracy: w.PronunciationAssessment?.AccuracyScore ?? 100,
        errorType: w.PronunciationAssessment?.ErrorType ?? "None",
        offsetSec: Math.round((s.offsetSec + (w.Offset ?? 0) / 1e7) * 10) / 10,
      })),
    )
    .filter((w) => w.accuracy < 60 || (w.errorType !== "None" && w.errorType !== "Insertion"))
    .slice(0, 40);

  return {
    provider: "azure",
    accuracy: avg((s) => s.pa.AccuracyScore) ?? 0,
    fluency: avg((s) => s.pa.FluencyScore) ?? 0,
    prosody: avg((s) => s.pa.ProsodyScore),
    completeness: avg((s) => s.pa.CompletenessScore),
    overall: avg((s) => s.pa.PronScore) ?? 0,
    weakWords,
    chunks: scored.length,
  };
}
