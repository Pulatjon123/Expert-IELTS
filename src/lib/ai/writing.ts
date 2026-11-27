import "server-only";
import { z } from "zod";
import type { WritingQuestion } from "@prisma/client";
import { generateStructured } from "./claude";
import { WEAKNESS_KEYS } from "../weakness";
import { MIN_WORDS } from "../ielts";
import { IMAGE_URL_PREFIX, imageForAi } from "../images";

// ───────────────────────────── Preparation ─────────────────────────────

export const WritingPrepSchema = z.object({
  analysis: z.object({
    questionType: z.string(),
    mainRequirements: z.array(z.string()),
    keyInstructions: z.array(z.string()),
    examinerExpectations: z.array(z.string()),
    commonMistakes: z.array(z.string()),
  }),
  ideas: z.object({
    perspectives: z.array(
      z.object({
        title: z.string(),
        points: z.array(z.object({ point: z.string(), explanation: z.string(), example: z.string() })),
      }),
    ),
    paragraphPlan: z.array(z.object({ paragraph: z.string(), purpose: z.string(), content: z.string() })),
  }),
  vocabulary: z.array(z.object({ term: z.string(), uzbek: z.string(), definition: z.string(), example: z.string() })),
  collocations: z.array(z.object({ phrase: z.string(), uzbek: z.string(), explanation: z.string(), example: z.string() })),
  phrases: z.object({
    introduction: z.array(z.string()),
    development: z.array(z.string()),
    comparison: z.array(z.string()),
    causeEffect: z.array(z.string()),
    conclusion: z.array(z.string()),
  }),
  modelAnswer: z.object({ text: z.string(), notes: z.array(z.string()) }),
});
export type WritingPrep = z.infer<typeof WritingPrepSchema>;

const PREP_SYSTEM = `You are a senior IELTS Writing teacher and former examiner preparing a student for one specific IELTS Academic Writing question.

Produce preparation material that genuinely helps a student plan and write their OWN answer:
- Analysis: identify the exact question type, every part of the task the student must address, key instruction words, and what an examiner looks for under the four criteria (Task Achievement/Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy). Include common mistakes for this question type.
- Ideas: for Task 2, give 2–3 perspectives with well-reasoned points, each with an explanation and a concrete, realistic example (no invented statistics presented as fact; hypothetical examples must be clearly generic). For Task 1, the "perspectives" are the overview and the groups of key features, and every figure you mention must come from the data provided — never invent data. Give a paragraph-by-paragraph plan.
- Vocabulary: 12–16 precise, topic-specific items at Band 7–9 level that a strong candidate would genuinely use — not obscure or show-off words. Each with an accurate Uzbek translation (Latin script), a contextual definition and a natural example sentence.
- Collocations: 10–14 natural collocations for this topic with Uzbek meaning, a short explanation of usage and an example.
- Useful phrases: academic phrases grouped by function. Keep them natural; avoid memorised-sounding templates that examiners penalise.
- Model answer: a complete Band 8–9 response that answers every part of the question, with a clear position where required, logical paragraphing, natural (not forced) advanced vocabulary and accurate, varied grammar. Task 1: 170–200 words with a clear overview and accurate data. Task 2: 270–320 words. Add brief notes explaining what makes it strong.

Uzbek translations must be correct Uzbek (Latin alphabet, with o‘ and g‘). Be accurate and honest; do not claim the question appeared in a real exam.`;

export function describeQuestion(q: Pick<WritingQuestion, "task" | "category" | "prompt" | "visual"> & { imageUrl?: string | null }) {
  const visual = q.visual ? `\n\nData shown in the visual (JSON — this is the only data the student sees):\n${JSON.stringify(q.visual)}` : "";
  const image = q.imageUrl?.startsWith(IMAGE_URL_PREFIX) ? "\n\nThe attached image is the chart/diagram the student sees with this question. Read its data carefully and use it." : "";
  return `IELTS Academic Writing ${q.task === "TASK1" ? "Task 1" : "Task 2"} (question type: ${q.category}).\n\nQuestion:\n${q.prompt}${visual}${image}`;
}

/** The question's uploaded image, ready to send to Claude (empty when there is none). */
export async function questionImages(q: { imageUrl?: string | null }) {
  const img = await imageForAi(q.imageUrl);
  return img ? [img] : [];
}

export async function generateWritingPrep(q: WritingQuestion, userId: string) {
  return generateStructured({
    feature: "writing_prep",
    userId,
    system: PREP_SYSTEM,
    prompt: describeQuestion(q),
    images: await questionImages(q),
    schema: WritingPrepSchema,
    tier: "primary",
    effort: "medium",
  });
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

export const WritingAssessmentSchema = z.object({
  criteria: z.object({ TA: Criterion, CC: Criterion, LR: Criterion, GRA: Criterion }),
  summary: z.string(),
  grammarCorrections: z.array(z.object({ original: z.string(), corrected: z.string(), explanation: z.string() })),
  vocabulary: z.object({
    summary: z.string(),
    effective: z.array(z.string()),
    improvements: z.array(z.object({ original: z.string(), suggestion: z.string(), reason: z.string() })),
  }),
  collocations: z.array(z.object({ original: z.string(), natural: z.string(), explanation: z.string() })),
  repetition: z.array(z.object({ word: z.string(), alternatives: z.array(z.string()) })),
  improvedEssay: z.string(),
  nextBand: z.object({ target: z.string(), steps: z.array(z.string()) }),
  weaknesses: z.array(
    z.object({
      key: z.enum(WEAKNESS_KEYS),
      severity: z.number().int(),
      explanation: z.string(),
      example: z.string(),
      correction: z.string(),
    }),
  ),
  vocabUsage: z.array(
    z.object({ expression: z.string(), verdict: z.enum(["CORRECT", "INCORRECT", "UNNATURAL"]), context: z.string(), comment: z.string() }),
  ),
});
export type WritingAssessmentOutput = z.infer<typeof WritingAssessmentSchema>;

const ASSESS_SYSTEM = `You are an experienced, strict but fair IELTS Writing examiner. Assess the student's response using the public IELTS Writing band descriptors for the four criteria:
- TA: Task Achievement (Task 1) / Task Response (Task 2)
- CC: Coherence and Cohesion
- LR: Lexical Resource
- GRA: Grammatical Range and Accuracy

Rules:
- Give each criterion a WHOLE band from 0 to 9, based only on evidence in the response. Do not inflate. Under-length responses are penalised in TA (Task 1 < 150 words, Task 2 < 250 words). Memorised or off-topic material is penalised. Task 1 with no clear overview cannot exceed band 5 in TA; inaccurate data lowers TA.
- Do NOT reward advanced vocabulary simply for being advanced: reward it only when it is precise, natural and accurate. Penalise forced, unnatural or wrongly used "big words".
- Every "quote", "original" and grammar error you cite MUST be copied exactly, character for character, from the student's response. Never invent quotes.
- grammarCorrections: list the real errors (up to 25), minimal correction, short explanation.
- repetition: words or phrases the student overuses (only if genuinely repeated), with accurate alternatives.
- improvedEssay: rewrite the student's response at about one band higher than its current level, keeping the student's own ideas and structure where possible so they can see realistic next steps.
- nextBand: concrete steps to reach the next band.
- weaknesses: recurring problem patterns in THIS response, using only the allowed keys. severity 1 (minor) – 3 (seriously limits the score). example must be an exact quote from the response.
- vocabUsage: ONLY for expressions from the student's saved vocabulary list that actually appear in the response (allowing for inflection). Judge whether each was used correctly and naturally. If none appear, return an empty list.
- Write explanations in clear, simple English a B1–B2 learner can understand.
These are AI estimates for practice, not official IELTS results.`;

export async function assessWriting(args: {
  question: WritingQuestion;
  essay: string;
  wordCount: number;
  savedVocab: string[];
  knownWeaknesses?: string[];
  userId: string;
}) {
  const min = MIN_WORDS[args.question.task];
  const prompt = `${describeQuestion(args.question)}

Minimum length: ${min} words. The student's response has ${args.wordCount} words.

Student's saved vocabulary list (check usage only for these):
${args.savedVocab.length ? args.savedVocab.map((v) => `- ${v}`).join("\n") : "(none)"}

This student's known recurring weaknesses from earlier attempts (check carefully whether each still occurs; report it again in weaknesses only if it appears in this response, and mention clear improvement in the feedback):
${args.knownWeaknesses?.length ? args.knownWeaknesses.map((w) => `- ${w}`).join("\n") : "(none yet)"}

<student_response>
${args.essay}
</student_response>`;
  return generateStructured({
    feature: "writing_assess",
    userId: args.userId,
    system: ASSESS_SYSTEM,
    prompt,
    images: await questionImages(args.question),
    schema: WritingAssessmentSchema,
    tier: "primary",
    effort: "high",
  });
}

// ───────────────────────────── Question generation ─────────────────────────────

export const GeneratedQuestionSchema = z.object({
  topic: z.string(),
  prompt: z.string(),
  chart: z.object({
    type: z.enum(["line", "bar", "pie", "table", "none"]),
    title: z.string(),
    unit: z.string(),
    categories: z.array(z.string()),
    series: z.array(z.object({ name: z.string(), values: z.array(z.number()) })),
    columns: z.array(z.string()),
    rows: z.array(z.array(z.string())),
  }),
});

export async function generateWritingQuestion(task: "TASK1" | "TASK2", category: string, avoidTopics: string[], userId: string) {
  const system = `You write original IELTS Academic Writing practice questions in authentic IELTS style and difficulty. They are clearly AI-generated practice material: never claim or imply they appeared in a real exam.
For Task 1, provide realistic but clearly fictional data in "chart" (use type line/bar/pie for charts — pie series values must add up to about 100 — or "table" with columns and rows). Use the standard Task 1 instruction sentence. For Task 2, set chart.type to "none" with empty arrays, and end the prompt with the standard IELTS instruction ("Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.").`;
  const prompt = `Write one ${task === "TASK1" ? "Task 1" : "Task 2"} question of type ${category}. Choose a topic different from: ${avoidTopics.slice(0, 30).join(", ") || "(none)"}.`;
  return generateStructured({ feature: "question_generate", userId, system, prompt, schema: GeneratedQuestionSchema, tier: "fast", effort: "low", maxTokens: 8000 });
}
