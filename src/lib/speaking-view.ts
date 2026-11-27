import "server-only";
import { prisma } from "./db";
import { HttpError } from "./auth";
import { topicQuestions } from "./ai/speaking";
import { asInterview } from "./interview-state";
import type { AudioMetrics } from "./audio/metrics";
import type { PronunciationResult } from "./audio/pronunciation";
import type { SttSegment, SttWord } from "./audio/stt";

export interface RecordingView {
  id: string;
  attempt: number;
  questionIndex: number;
  durationSec: number | null;
  transcript: string | null;
  segments: SttSegment[];
  words: SttWord[];
  annotations: { text: string; kind: "grammar" | "vocab" | "repetition" | "unnatural"; note: string; correction: string }[];
  metrics: AudioMetrics | null;
  pronunciation: PronunciationResult | null;
  createdAt: string;
}

/** Everything the speaking workspace needs, for the owner of the session only. Audio is fetched separately. */
export async function speakingSessionView(sessionId: string, userId: string, isAdmin = false) {
  const s = await prisma.speakingSession.findFirst({
    where: { id: sessionId, ...(isAdmin ? {} : { userId }) },
    include: { topic: true, recordings: { orderBy: { createdAt: "asc" } }, assessments: true },
  });
  if (!s || !s.topic) throw new HttpError(404, "Speaking session not found.");
  const recordings: RecordingView[] = s.recordings.map((r) => {
    const seg = (r.segments as { segments?: SttSegment[]; words?: SttWord[] } | null) ?? {};
    return {
      id: r.id,
      attempt: r.attempt,
      questionIndex: r.questionIndex,
      durationSec: r.durationSec,
      transcript: r.transcript,
      segments: seg.segments ?? [],
      words: seg.words ?? [],
      annotations: (r.annotations as RecordingView["annotations"]) ?? [],
      metrics: (r.audioMetrics as unknown as AudioMetrics) ?? null,
      pronunciation: (r.pronunciation as unknown as PronunciationResult) ?? null,
      createdAt: r.createdAt.toISOString(),
    };
  });
  return {
    id: s.id,
    status: s.status,
    createdAt: s.createdAt.toISOString(),
    topic: {
      id: s.topic.id,
      part: s.topic.part,
      topic: s.topic.topic,
      title: s.topic.title,
      cueCard: s.topic.cueCard,
      bulletPoints: s.topic.bulletPoints,
      source: s.topic.source,
      sourceNote: s.topic.sourceNote,
      reportedAt: s.topic.reportedAt?.toISOString() ?? null,
      linkedTopicId: s.topic.linkedTopicId,
    },
    mode: s.mode,
    questions: s.mode === "INTERVIEW" ? (asInterview(s.interview)?.turns.map((t) => t.text) ?? []) : topicQuestions(s.topic),
    interview: s.mode === "INTERVIEW" ? asInterview(s.interview) : null,
    recordings,
    assessments: s.assessments.map((a) => ({
      attempt: a.attempt,
      overallBand: a.overallBand,
      fcBand: a.fcBand,
      lrBand: a.lrBand,
      graBand: a.graBand,
      pronBand: a.pronBand,
      pronunciationAssessed: a.pronunciationAssessed,
      feedback: a.feedback as unknown,
      model: a.model,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

export type SpeakingSessionView = Awaited<ReturnType<typeof speakingSessionView>>;
