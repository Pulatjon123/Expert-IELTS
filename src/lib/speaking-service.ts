import "server-only";
import type { Prisma, SpeakingRecording, SpeakingTopic } from "@prisma/client";
import { asInterview, currentTurnIndex } from "./interview-state";
import { prisma } from "./db";
import { HttpError } from "./auth";
import { deleteFile, readStoredFile, saveFile } from "./storage";
import { parseWav, SAMPLE_RATE } from "./audio/wav";
import { transcribe, type SttResult } from "./audio/stt";
import { computeMetrics, type AudioMetrics } from "./audio/metrics";
import { assessPronunciation, type PronunciationResult } from "./audio/pronunciation";
import { isSttConfigured } from "./ai/services";
import { AiNotConfiguredError } from "./ai/errors";
import { assessSpeaking, describeTopic, generateSpeakingPrep, SpeakingPrepSchema, topicQuestions, type SpeakingAssessmentOutput } from "./ai/speaking";
import { candidateVocab, focusWeaknesses, occursIn, recordVocabUsage, recordWeaknesses, updateWeaknessStatuses } from "./learning";
import { clampCriterion, overallBand } from "./ielts";

export const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

export async function pickSpeakingTopic(userId: string, part: number, excludeId?: string) {
  const all = await prisma.speakingTopic.findMany({ where: { part, isActive: true }, select: { id: true } });
  if (!all.length) return null;
  const hist = await prisma.questionHistory.findMany({
    where: { userId, skill: "SPEAKING" },
    orderBy: { servedAt: "desc" },
    take: Math.max(0, all.length - 1),
    select: { questionId: true },
  });
  const recent = new Set(hist.map((h) => h.questionId));
  if (excludeId) recent.add(excludeId);
  const fresh = all.filter((t) => !recent.has(t.id));
  const pool = fresh.length ? fresh : all.filter((t) => t.id !== excludeId).length ? all.filter((t) => t.id !== excludeId) : all;
  const choice = pool[Math.floor(Math.random() * pool.length)];
  await prisma.questionHistory.create({ data: { userId, skill: "SPEAKING", questionId: choice.id } });
  return choice.id;
}

/** The questions a session's recordings answer: the cue card/question set, or the examiner's turns in an interview. */
export function sessionQuestions(session: { mode: string; interview: unknown; topic: SpeakingTopic | null }): string[] {
  if (session.mode === "INTERVIEW") return asInterview(session.interview)?.turns.map((t) => t.text) ?? [];
  if (!session.topic) throw new HttpError(400, "This session has no question set.");
  return topicQuestions(session.topic);
}

export async function getOwnedSession(sessionId: string, userId: string) {
  const s = await prisma.speakingSession.findFirst({ where: { id: sessionId, userId }, include: { topic: true } });
  if (!s) throw new HttpError(404, "Speaking session not found.");
  return s;
}

/** Store a new recording (replacing an earlier take of the same question/attempt) and transcribe it if STT is configured. */
export async function saveRecording(args: {
  sessionId: string;
  userId: string;
  attempt: number;
  questionIndex: number;
  audio: Buffer;
}) {
  const session = await getOwnedSession(args.sessionId, args.userId);
  const questions = sessionQuestions(session);
  if (args.questionIndex < 0 || args.questionIndex >= questions.length) throw new HttpError(400, "Invalid question.");
  if (session.mode === "INTERVIEW") {
    // In an interview only the examiner's latest question can be (re-)answered: later questions build on earlier answers.
    const state = asInterview(session.interview);
    if (!state || args.attempt !== 1 || currentTurnIndex(state) !== args.questionIndex) throw new HttpError(409, "This question can no longer be answered.");
  }
  if (args.audio.length > MAX_AUDIO_BYTES) throw new HttpError(413, "Recording is too large.");
  let info;
  try {
    info = parseWav(args.audio);
  } catch {
    throw new HttpError(400, "Unsupported audio format. Please record again.");
  }
  if (info.sampleRate !== SAMPLE_RATE || info.channels !== 1 || info.bitsPerSample !== 16) throw new HttpError(400, "Audio must be 16 kHz mono WAV.");
  if (info.durationSec < 1) throw new HttpError(400, "The recording is too short.");
  if (info.durationSec > 330) throw new HttpError(400, "The recording is longer than 5 minutes.");

  const previous = await prisma.speakingRecording.findMany({
    where: { sessionId: args.sessionId, attempt: args.attempt, questionIndex: args.questionIndex },
  });
  const rec = await prisma.speakingRecording.create({
    data: {
      sessionId: args.sessionId,
      attempt: args.attempt,
      questionIndex: args.questionIndex,
      questionText: questions[args.questionIndex],
      audioPath: "pending",
      mimeType: "audio/wav",
      sizeBytes: args.audio.length,
      durationSec: Math.round(info.durationSec * 10) / 10,
    },
  });
  const audioPath = `audio/${args.userId}/${rec.id}.wav`;
  await saveFile(audioPath, args.audio);
  await prisma.speakingRecording.update({ where: { id: rec.id }, data: { audioPath } });
  for (const p of previous) {
    await deleteFile(p.audioPath).catch(() => {});
    await prisma.speakingRecording.delete({ where: { id: p.id } });
  }
  await prisma.speakingSession.update({ where: { id: args.sessionId }, data: { updatedAt: new Date() } });

  if (!isSttConfigured()) return { recording: { ...rec, audioPath }, transcriptionError: "Speech-to-text is not configured on this server." };
  try {
    return { recording: await transcribeRecording(rec.id, args.userId) };
  } catch (e) {
    return { recording: { ...rec, audioPath }, transcriptionError: e instanceof Error ? e.message : "Transcription failed." };
  }
}

export async function transcribeRecording(recordingId: string, userId: string) {
  const rec = await prisma.speakingRecording.findUnique({ where: { id: recordingId } });
  if (!rec) throw new HttpError(404, "Recording not found.");
  const audio = await readStoredFile(rec.audioPath);
  const stt = await transcribe(audio, `${rec.id}.wav`, userId);
  const metrics = computeMetrics(stt, rec.durationSec ?? parseWav(audio).durationSec);
  return prisma.speakingRecording.update({
    where: { id: rec.id },
    data: {
      transcript: stt.text,
      segments: { segments: stt.segments, words: stt.words } as unknown as Prisma.InputJsonValue,
      audioMetrics: metrics as unknown as Prisma.InputJsonValue,
      sttProvider: stt.provider,
    },
  });
}

export async function getOrCreateSpeakingPrep(topicId: string, userId: string) {
  const cached = await prisma.speakingPrep.findUnique({ where: { topicId } });
  if (cached) {
    const p = SpeakingPrepSchema.safeParse(cached.content);
    if (p.success) return { content: p.data, model: cached.model, cached: true };
  }
  const topic = await prisma.speakingTopic.findUnique({ where: { id: topicId } });
  if (!topic) throw new HttpError(404, "Topic not found.");
  const { data, model } = await generateSpeakingPrep(topic, userId);
  await prisma.speakingPrep.upsert({ where: { topicId }, create: { topicId, content: data, model }, update: { content: data, model } });
  return { content: data, model, cached: false };
}

function latestPerQuestion(recs: SpeakingRecording[]) {
  const map = new Map<number, SpeakingRecording>();
  for (const r of recs) {
    const cur = map.get(r.questionIndex);
    if (!cur || cur.createdAt < r.createdAt) map.set(r.questionIndex, r);
  }
  return [...map.values()].sort((a, b) => a.questionIndex - b.questionIndex);
}

/** Drop annotations / quotes that do not occur in the verbatim transcript. */
function verify(out: SpeakingAssessmentOutput, transcripts: Map<number, string>) {
  const all = [...transcripts.values()].join("\n");
  for (const c of Object.values(out.criteria)) {
    c.examples = c.examples.filter((e) => occursIn(all, e.quote));
    c.band = clampCriterion(c.band);
  }
  out.annotations = out.annotations
    .filter((a) => transcripts.has(a.questionIndex))
    .map((a) => ({ ...a, items: a.items.filter((it) => occursIn(transcripts.get(a.questionIndex)!, it.text)) }));
  out.weaknesses = out.weaknesses.filter((w, i, arr) => arr.findIndex((x) => x.key === w.key) === i).filter((w) => occursIn(all, w.example) || ["hesitation", "filler_words", "short_answers", "pronunciation_sounds", "word_stress", "intonation"].includes(w.key));
  return out;
}

export async function assessAttempt(sessionId: string, userId: string, attempt: number) {
  const session = await getOwnedSession(sessionId, userId);
  const interview = session.mode === "INTERVIEW" ? asInterview(session.interview) : null;
  if (session.mode === "INTERVIEW" && (!interview || interview.phase !== "done")) throw new HttpError(400, "Finish the interview before requesting the assessment.");
  if (!interview && !session.topic) throw new HttpError(400, "This session has no question set.");
  const context = interview
    ? `A complete AI examiner IELTS Speaking interview (${interview.format === "full" ? "Parts 1, 2 and 3" : interview.format === "part1" ? "Part 1 only" : "Parts 2 and 3"}). Each answer below is the student's reply to the examiner's question. Assess the performance across the whole interview.`
    : describeTopic(session.topic!);
  const recs = latestPerQuestion(await prisma.speakingRecording.findMany({ where: { sessionId, attempt } }));
  if (!recs.length) throw new HttpError(400, "Record at least one answer first.");
  if (!isSttConfigured() && recs.some((r) => !r.transcript)) throw new AiNotConfiguredError("Speech-to-text (STT_API_URL / STT_API_KEY)");
  const ready: SpeakingRecording[] = [];
  for (const r of recs) ready.push(r.transcript == null ? await transcribeRecording(r.id, userId) : r);

  // Pronunciation from audio, only when the dedicated service is configured. Results are cached on the recording.
  for (let i = 0; i < ready.length; i++) {
    if (ready[i].pronunciation) continue;
    const pron = await assessPronunciation(await readStoredFile(ready[i].audioPath), userId);
    if (pron) ready[i] = await prisma.speakingRecording.update({ where: { id: ready[i].id }, data: { pronunciation: pron as unknown as Prisma.InputJsonValue } });
  }

  const transcripts = new Map(ready.map((r) => [r.questionIndex, r.transcript ?? ""]));
  const text = [...transcripts.values()].join("\n");
  const savedVocab = await candidateVocab(userId, text);
  const { data, model } = await assessSpeaking({
    context,
    answers: ready.map((r) => ({
      question: r.questionText,
      transcript: r.transcript ?? "",
      metrics: (r.audioMetrics as unknown as AudioMetrics) ?? null,
      pronunciation: (r.pronunciation as unknown as PronunciationResult) ?? null,
    })),
    savedVocab,
    knownWeaknesses: (await focusWeaknesses(userId, "SPEAKING", 6)).map((k) => `${k.key}: ${k.name}`),
    userId,
  });
  // The AI only sees questions in recording order; map its 0-based indices back to real question indices.
  const order = ready.map((r) => r.questionIndex);
  data.annotations = data.annotations.map((a) => ({ ...a, questionIndex: order[a.questionIndex] ?? -1 }));
  data.improvedAnswers = data.improvedAnswers.map((a) => ({ ...a, questionIndex: order[a.questionIndex] ?? -1 }));
  const out = verify(data, transcripts);

  const pronAssessed = ready.some((r) => r.pronunciation);
  const c = out.criteria;
  const pronBand = pronAssessed ? c.P.band : null;
  const overall = pronBand != null ? overallBand([c.FC.band, c.LR.band, c.GRA.band, pronBand]) : null;
  const saved = await prisma.speakingAssessment.upsert({
    where: { sessionId_attempt: { sessionId, attempt } },
    create: { sessionId, attempt, overallBand: overall, fcBand: c.FC.band, lrBand: c.LR.band, graBand: c.GRA.band, pronBand, pronunciationAssessed: pronAssessed, feedback: out, model },
    update: { overallBand: overall, fcBand: c.FC.band, lrBand: c.LR.band, graBand: c.GRA.band, pronBand, pronunciationAssessed: pronAssessed, feedback: out, model, createdAt: new Date() },
  });
  for (const r of ready) {
    const ann = out.annotations.find((a) => a.questionIndex === r.questionIndex);
    await prisma.speakingRecording.update({ where: { id: r.id }, data: { annotations: (ann?.items ?? []) as unknown as Prisma.InputJsonValue } });
  }
  // Only weaknesses with pronunciation keys need audio evidence.
  const weaknesses = out.weaknesses.filter((w) => pronAssessed || !["pronunciation_sounds", "word_stress", "intonation"].includes(w.key));
  await recordWeaknesses(userId, "SPEAKING", sessionId, weaknesses);
  await updateWeaknessStatuses(userId, "SPEAKING", weaknesses.map((w) => w.key));
  await recordVocabUsage(userId, "SPEAKING", sessionId, text, out.vocabUsage);
  if (attempt === 2 || interview) await prisma.speakingSession.update({ where: { id: sessionId }, data: { status: "COMPLETED" } });
  return saved;
}

export type { SttResult };
