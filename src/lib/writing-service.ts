import "server-only";
import type { WritingTask } from "@prisma/client";
import { prisma } from "./db";
import { HttpError } from "./auth";
import { assertWeeklyCheckAvailable } from "./ai/weekly-limit";
import { assessWriting, generateWritingPrep, WritingPrepSchema, type WritingAssessmentOutput } from "./ai/writing";
import { candidateVocab, focusWeaknesses, countOccurrences, occursIn, recordVocabUsage, recordWeaknesses, updateWeaknessStatuses } from "./learning";
import { clampCriterion, countWords, overallBand } from "./ielts";

/** Random active question, avoiding the ones this student saw most recently. */
export async function pickWritingQuestion(userId: string | null, task: WritingTask, category?: string, excludeId?: string) {
  const where = { task, isActive: true, ...(category ? { category } : {}) };
  const all = await prisma.writingQuestion.findMany({ where, select: { id: true } });
  if (!all.length) return null;
  let recent = new Set<string>();
  if (userId) {
    const hist = await prisma.questionHistory.findMany({
      where: { userId, skill: "WRITING" },
      orderBy: { servedAt: "desc" },
      take: Math.max(0, all.length - 1),
      select: { questionId: true },
    });
    recent = new Set(hist.map((h) => h.questionId));
  }
  if (excludeId) recent.add(excludeId);
  const fresh = all.filter((q) => !recent.has(q.id));
  const pool = fresh.length ? fresh : all.filter((q) => q.id !== excludeId).length ? all.filter((q) => q.id !== excludeId) : all;
  const choice = pool[Math.floor(Math.random() * pool.length)];
  if (userId) await prisma.questionHistory.create({ data: { userId, skill: "WRITING", questionId: choice.id } });
  return choice.id;
}

/** Preparation material is cached per question and shared by all students — one AI call per question, not per student. */
export async function getOrCreateWritingPrep(questionId: string, userId: string) {
  const cached = await prisma.writingPrep.findUnique({ where: { questionId } });
  if (cached) {
    const parsed = WritingPrepSchema.safeParse(cached.content);
    if (parsed.success) return { content: parsed.data, model: cached.model, cached: true };
  }
  const question = await prisma.writingQuestion.findUnique({ where: { id: questionId } });
  if (!question) throw new HttpError(404, "Question not found.");
  const { data, model } = await generateWritingPrep(question, userId);
  await prisma.writingPrep.upsert({ where: { questionId }, create: { questionId, content: data, model }, update: { content: data, model } });
  return { content: data, model, cached: false };
}

/** Drop any AI-cited text that does not really occur in the student's essay. */
function verifyAgainstEssay(out: WritingAssessmentOutput, essay: string) {
  for (const c of Object.values(out.criteria)) {
    c.examples = c.examples.filter((e) => occursIn(essay, e.quote));
    c.band = clampCriterion(c.band);
  }
  out.grammarCorrections = out.grammarCorrections.filter((g) => occursIn(essay, g.original));
  out.vocabulary.improvements = out.vocabulary.improvements.filter((v) => occursIn(essay, v.original));
  out.collocations = out.collocations.filter((c) => occursIn(essay, c.original));
  const repetition = out.repetition
    .map((r) => ({ ...r, count: countOccurrences(essay, r.word) }))
    .filter((r) => r.count >= 3);
  out.weaknesses = out.weaknesses.filter((w, i, arr) => arr.findIndex((x) => x.key === w.key) === i).filter((w) => occursIn(essay, w.example) || w.key === "word_count" || w.key === "task1_overview" || w.key === "task_response" || w.key === "paragraphing");
  return { ...out, repetition };
}

export async function submitAndAssess(attemptId: string, userId: string) {
  const attempt = await prisma.writingAttempt.findFirst({ where: { id: attemptId, userId }, include: { question: true } });
  if (!attempt) throw new HttpError(404, "Attempt not found.");
  const essay = attempt.content.trim();
  const wordCount = countWords(essay);
  if (wordCount < 30) throw new HttpError(400, "Please write at least 30 words before requesting an evaluation.");
  // Weekly limit is checked before anything changes, so the essay stays an editable draft if no checks are left.
  await assertWeeklyCheckAvailable(userId, "WRITING");

  await prisma.$transaction([
    prisma.writingDraftVersion.create({ data: { attemptId, content: essay, wordCount } }),
    prisma.writingAttempt.update({ where: { id: attemptId }, data: { status: "SUBMITTED", submittedAt: new Date(), wordCount } }),
  ]);

  try {
    const savedVocab = await candidateVocab(userId, essay);
    const knownWeaknesses = (await focusWeaknesses(userId, "WRITING", 6)).map((k) => `${k.key}: ${k.name}`);
    const { data, model } = await assessWriting({ question: attempt.question, essay, wordCount, savedVocab, knownWeaknesses, userId });
    const verified = verifyAgainstEssay(data, essay);
    const c = verified.criteria;
    const overall = overallBand([c.TA.band, c.CC.band, c.LR.band, c.GRA.band]);
    await prisma.writingAssessment.upsert({
      where: { attemptId },
      create: { attemptId, overallBand: overall, taBand: c.TA.band, ccBand: c.CC.band, lrBand: c.LR.band, graBand: c.GRA.band, feedback: verified, model },
      update: { overallBand: overall, taBand: c.TA.band, ccBand: c.CC.band, lrBand: c.LR.band, graBand: c.GRA.band, feedback: verified, model, createdAt: new Date() },
    });
    await prisma.writingAttempt.update({ where: { id: attemptId }, data: { status: "EVALUATED" } });
    await recordWeaknesses(userId, "WRITING", attemptId, verified.weaknesses);
    await updateWeaknessStatuses(userId, "WRITING", verified.weaknesses.map((w) => w.key));
    await recordVocabUsage(userId, "WRITING", attemptId, essay, verified.vocabUsage);
    return { overall };
  } catch (err) {
    await prisma.writingAttempt.update({ where: { id: attemptId }, data: { status: "FAILED" } });
    throw err;
  }
}
