import "server-only";
import { z } from "zod";
import type { SpeakingTopic } from "@prisma/client";
import { generateStructured } from "./claude";
import { WEAKNESS_KEYS } from "../weakness";
import type { AudioMetrics } from "../audio/metrics";
import type { PronunciationResult } from "../audio/pronunciation";

export function topicQuestions(t: Pick<SpeakingTopic, "part" | "questions" | "cueCard" | "bulletPoints">): string[] {
  if (t.part === 2) return [`${t.cueCard}\nYou should say:\n${t.bulletPoints.map((b) => `- ${b}`).join("\n")}`];
  return t.questions;
}

export function describeTopic(t: SpeakingTopic) {
  return `IELTS Speaking Part ${t.part} — topic: ${t.topic} (${t.title}).\n\nQuestions:\n${topicQuestions(t)
    .map((q, i) => `${i + 1}. ${q}`)
    .join("\n")}`;
}

// ───────────────────────────── Preparation ─────────────────────────────

export const SpeakingPrepSchema = z.object({
  approach: z.string(),
  answers: z.array(
    z.object({
      question: z.string(),
      ideas: z.array(z.string()),
      structure: z.string(),
      sampleAnswer: z.string(),
    }),
  ),
  vocabulary: z.array(z.object({ term: z.string(), uzbek: z.string(), definition: z.string(), example: z.string() })),
  collocations: z.array(z.object({ phrase: z.string(), uzbek: z.string(), explanation: z.string(), example: z.string() })),
  phrases: z.object({
    starting: z.array(z.string()),
    buyingTime: z.array(z.string()),
    opinions: z.array(z.string()),
    examples: z.array(z.string()),
    contrasting: z.array(z.string()),
    finishing: z.array(z.string()),
  }),
  originalityTips: z.array(z.string()),
});
export type SpeakingPrep = z.infer<typeof SpeakingPrepSchema>;

const PREP_SYSTEM = `You are an expert IELTS Speaking coach. The student has already answered these questions once on their own; now prepare them to answer again better.

Teach them to build ORIGINAL answers, not to memorise scripts (examiners recognise and penalise memorised answers):
- approach: how to handle this Part (Part 1: direct answer + reason + short example, 2–4 sentences; Part 2: use the 1-minute notes, cover every bullet, speak for the full 2 minutes, tell it as a story; Part 3: give a position, explain, give an example, consider another view).
- answers: for every question, 3–5 idea prompts (short notes, not sentences), a suggested structure, and one natural Band 8–9 spoken sample answer. Samples must sound like natural speech (contractions, discourse markers, spoken rhythm), not written essays. Part 1 samples ~40–60 words, Part 2 ~250–300 words, Part 3 ~80–120 words.
- vocabulary: 10–14 topic-specific items natural in spoken English, with accurate Uzbek translation (Latin script, with o‘ and g‘), definition and an example spoken sentence.
- collocations: 8–12 natural spoken collocations with Uzbek meaning.
- phrases: useful spoken phrases by function. Natural, not clichéd ("Well, to be honest…", not "It is a truth universally acknowledged").
- originalityTips: 3–5 tips on personalising answers with their own experience.`;

export async function generateSpeakingPrep(t: SpeakingTopic, userId: string) {
  return generateStructured({ feature: "speaking_prep", userId, system: PREP_SYSTEM, prompt: describeTopic(t), schema: SpeakingPrepSchema, tier: "primary", effort: "medium" });
}

// ───────────────────────────── Assessment ─────────────────────────────

const Criterion = z.object({
  band: z.number().int(),
  explanation: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  examples: z.array(z.object({ quote: z.string(), comment: z.string() })),
  recommendations: z.array(z.string()),
});

export const SpeakingAssessmentSchema = z.object({
  criteria: z.object({ FC: Criterion, LR: Criterion, GRA: Criterion, P: Criterion }),
  summary: z.string(),
  analysis: z.object({
    fluency: z.string(),
    hesitation: z.string(),
    repetition: z.string(),
    vocabularyRange: z.string(),
    collocationAccuracy: z.string(),
    grammaticalAccuracy: z.string(),
    pronunciation: z.string(),
  }),
  annotations: z.array(
    z.object({
      questionIndex: z.number().int(),
      items: z.array(
        z.object({ text: z.string(), kind: z.enum(["grammar", "vocab", "repetition", "unnatural"]), note: z.string(), correction: z.string() }),
      ),
    }),
  ),
  improvedAnswers: z.array(z.object({ questionIndex: z.number().int(), answer: z.string() })),
  nextBand: z.object({ target: z.string(), steps: z.array(z.string()) }),
  weaknesses: z.array(
    z.object({ key: z.enum(WEAKNESS_KEYS), severity: z.number().int(), explanation: z.string(), example: z.string(), correction: z.string() }),
  ),
  vocabUsage: z.array(z.object({ expression: z.string(), verdict: z.enum(["CORRECT", "INCORRECT", "UNNATURAL"]), context: z.string(), comment: z.string() })),
});
export type SpeakingAssessmentOutput = z.infer<typeof SpeakingAssessmentSchema>;

const ASSESS_SYSTEM = `You are an experienced, strict but fair IELTS Speaking examiner. Assess the student's answers using the public IELTS Speaking band descriptors:
- FC: Fluency and Coherence
- LR: Lexical Resource
- GRA: Grammatical Range and Accuracy
- P: Pronunciation

Evidence you receive for each answer:
1. A verbatim machine transcript (speech-to-text). It may miss some fillers or mishear words — do not penalise obvious recognition errors, and never treat the transcript as the student's spelling.
2. Objective measurements computed from the audio timestamps: duration, speaking rate, pauses, filler words, self-repetitions.
3. Pronunciation measurements from a dedicated audio pronunciation-assessment service — ONLY if provided.

Rules:
- Whole bands 0–9 for each criterion, based only on the evidence. Do not inflate. Very short answers limit FC and LR.
- FC: use the pause/filler/rate measurements as evidence of hesitation, alongside coherence and development of ideas in the transcript.
- PRONUNCIATION MUST COME FROM AUDIO EVIDENCE. If no pronunciation measurements are provided, set P.band to 0, P.explanation to "Not assessed: no audio pronunciation analysis is configured.", leave the P lists empty, and say in analysis.pronunciation that it was not assessed. Never infer pronunciation from the transcript text. If measurements are provided, base P on them (accuracy, fluency, prosody/intonation, specific mispronounced words) and the descriptors; mention word stress, sentence stress and intonation only as far as the prosody evidence supports.
- Do not reward advanced vocabulary for being advanced — only when used naturally and accurately.
- Every "quote", annotation "text" and weakness "example" MUST be copied exactly from the transcript of that answer. Never invent quotes and never rewrite the transcript.
- annotations: per answer (questionIndex is 0-based), mark grammar mistakes, incorrect vocabulary, unnatural expressions and noticeable repetition, each with a short note and a correction.
- improvedAnswers: per answer, a version about one band higher that keeps the student's own ideas (natural spoken style).
- weaknesses: recurring patterns using only the allowed keys (include speaking keys such as hesitation, filler_words, short_answers where the measurements support them; pronunciation keys only with audio evidence). severity 1–3.
- vocabUsage: ONLY expressions from the student's saved list that actually appear in the transcripts.
- Explanations in clear, simple English. These are AI estimates for practice, not official IELTS results.`;

export interface AnswerEvidence {
  question: string;
  transcript: string;
  metrics: AudioMetrics | null;
  pronunciation: PronunciationResult | null;
}

/** `context` is a short description of the test: a practice question set, or a full examiner interview. */
export async function assessSpeaking(args: { context: string; answers: AnswerEvidence[]; savedVocab: string[]; knownWeaknesses?: string[]; userId: string }) {
  const hasPron = args.answers.some((a) => a.pronunciation);
  const body = args.answers
    .map((a, i) => {
      const m = a.metrics;
      const metrics = m
        ? `duration ${m.durationSec}s, ${m.wordCount} words, ${m.wpm} wpm overall${m.articulationWpm ? `, ${m.articulationWpm} wpm while speaking` : ""}, ` +
          `${m.pauses ? `${m.pauses.count} pauses ≥1s (longest ${m.pauses.longestSec}s, total ${m.pauses.totalSec}s)` : "pause data unavailable"}, ` +
          `${m.fillers.count} fillers (${m.fillers.perMinute}/min: ${JSON.stringify(m.fillers.items)}), self-repetitions: ${m.selfRepetitions.join(", ") || "none"}`
        : "unavailable";
      const p = a.pronunciation;
      const pron = p
        ? `accuracy ${p.accuracy}/100, fluency ${p.fluency}/100, prosody ${p.prosody ?? "n/a"}/100, overall ${p.overall}/100; low-scoring words: ${
            p.weakWords.map((w) => `${w.word} (${w.accuracy}, ${w.errorType})`).join(", ") || "none"
          }`
        : "not available";
      return `<answer index="${i}">\nQuestion: ${a.question}\nMeasurements: ${metrics}\nPronunciation measurements: ${pron}\n<transcript>\n${a.transcript || "(no speech detected)"}\n</transcript>\n</answer>`;
    })
    .join("\n\n");
  const prompt = `${args.context}

Audio pronunciation analysis available: ${hasPron ? "YES" : "NO — do not assess pronunciation"}.

Student's saved vocabulary list (check usage only for these):
${args.savedVocab.length ? args.savedVocab.map((v) => `- ${v}`).join("\n") : "(none)"}

This student's known recurring weaknesses from earlier attempts (check carefully whether each still occurs; report it again in weaknesses only if it appears in this response, and mention clear improvement in the feedback):
${args.knownWeaknesses?.length ? args.knownWeaknesses.map((w) => `- ${w}`).join("\n") : "(none yet)"}

${body}`;
  return generateStructured({ feature: "speaking_assess", userId: args.userId, system: ASSESS_SYSTEM, prompt, schema: SpeakingAssessmentSchema, tier: "primary", effort: "high" });
}
