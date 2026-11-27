import "server-only";
import { prisma } from "./db";
import { HttpError } from "./auth";
import { ComparisonSchema, generateComparison, type Comparison } from "./ai/compare";
import { describeQuestion, questionImages } from "./ai/writing";
import { topicQuestions } from "./ai/speaking";
import { occursIn } from "./learning";

/** Cache key: a writing question id, or `${topicId}:${questionIndex}` for a speaking question. */
export function compareKey(skill: "WRITING" | "SPEAKING", id: string, index = 0) {
  return skill === "WRITING" ? id : `${id}:${index}`;
}

export async function getCachedComparison(skill: "WRITING" | "SPEAKING", key: string): Promise<Comparison | null> {
  const row = await prisma.bandComparison.findUnique({ where: { skill_questionId: { skill, questionId: key } } });
  const parsed = row ? ComparisonSchema.safeParse(row.content) : null;
  return parsed?.success ? parsed.data : null;
}

/** Generated once per question and shared by all students. */
export async function getOrCreateComparison(skill: "WRITING" | "SPEAKING", id: string, index: number, userId: string) {
  const key = compareKey(skill, id, index);
  const cached = await getCachedComparison(skill, key);
  if (cached) return cached;
  let question: string;
  let detail: string;
  let images: Awaited<ReturnType<typeof questionImages>> = [];
  if (skill === "WRITING") {
    const q = await prisma.writingQuestion.findUnique({ where: { id } });
    if (!q) throw new HttpError(404, "Question not found.");
    question = describeQuestion(q);
    images = await questionImages(q);
    detail = q.task === "TASK1" ? "Academic Task 1 report (about 170–190 words each)" : "Task 2 essay (about 260–300 words each)";
  } else {
    const t = await prisma.speakingTopic.findUnique({ where: { id } });
    if (!t) throw new HttpError(404, "Question set not found.");
    const qs = topicQuestions(t);
    if (index < 0 || index >= qs.length) throw new HttpError(400, "Invalid question.");
    question = qs[index];
    detail = t.part === 1 ? "Part 1 answer (40–70 words each)" : t.part === 2 ? "Part 2 long turn (about 2 minutes of speech, 220–300 words each)" : "Part 3 discussion answer (90–130 words each)";
  }
  const { data, model } = await generateComparison({ skill, question, detail, userId, images });
  const sorted = [...data.answers].sort((a, b) => a.band - b.band).slice(0, 3);
  if (sorted.length !== 3) throw new HttpError(502, "The AI did not return three answers. Please try again.");
  data.answers = sorted.map((a, i) => ({ ...a, band: [6, 7, 8][i] }));
  // Keep only highlights that really occur in the answer they refer to.
  data.highlights = data.highlights.filter((h) => {
    const a = data.answers.find((x) => x.band === h.band);
    return a && occursIn(a.text, h.text);
  });
  await prisma.bandComparison.upsert({
    where: { skill_questionId: { skill, questionId: key } },
    create: { skill, questionId: key, content: data, model },
    update: { content: data, model },
  });
  return data;
}
