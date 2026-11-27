import "server-only";
import type { Skill } from "@prisma/client";
import { prisma } from "./db";
import { WEAKNESS_CATALOG, type WeaknessKey } from "./weakness";

export function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[‘’`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** True when `quote` really occurs in `source` (ignoring case, curly quotes and whitespace). Used to drop invented AI quotes. */
export function occursIn(source: string, quote: string) {
  const q = normalize(quote).replace(/^["'.,…\s]+|["'.,…\s]+$/g, "");
  return q.length > 0 && normalize(source).includes(q);
}

export function countOccurrences(source: string, phrase: string) {
  const p = normalize(phrase).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!p) return 0;
  return (normalize(source).match(new RegExp(`\\b${p}\\b`, "g")) ?? []).length;
}

/** Store the weakness patterns the AI detected (with verified examples) in the student's learning memory. */
export async function recordWeaknesses(
  userId: string,
  skill: Skill,
  sourceId: string,
  items: { key: WeaknessKey; severity: number; explanation: string; example: string; correction?: string }[],
) {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.key)) continue;
    seen.add(item.key);
    const cat = WEAKNESS_CATALOG[item.key];
    const severity = Math.max(1, Math.min(3, Math.round(item.severity)));
    const existing = await prisma.weakness.findUnique({ where: { userId_key: { userId, key: item.key } } });
    const weakness = existing
      ? await prisma.weakness.update({
          where: { id: existing.id },
          data: {
            lastSeen: new Date(),
            severity: Math.max(severity, Math.round((existing.severity + severity) / 2)),
            explanation: item.explanation,
            status: "ACTIVE",
            skills: existing.skills.includes(skill) ? undefined : { push: skill },
          },
        })
      : await prisma.weakness.create({
          data: { userId, key: item.key, name: cat.name, skills: [skill], severity, explanation: item.explanation, recommendedPractice: cat.practice },
        });
    await prisma.weaknessOccurrence.create({
      data: { weaknessId: weakness.id, skill, sourceId, example: item.example.slice(0, 600), correction: item.correction?.slice(0, 600) || null },
    });
  }
}

/**
 * After an attempt is assessed, weaknesses that were tracked but NOT seen in it move towards resolved:
 * ACTIVE -> IMPROVING after 2 consecutive clean attempts in that skill, IMPROVING -> RESOLVED after 4.
 */
export async function updateWeaknessStatuses(userId: string, skill: Skill, detectedKeys: string[]) {
  const tracked = await prisma.weakness.findMany({ where: { userId, skills: { has: skill }, key: { notIn: detectedKeys }, status: { not: "RESOLVED" } } });
  if (!tracked.length) return;
  const attempts =
    skill === "WRITING"
      ? await prisma.writingAttempt.findMany({ where: { userId, status: "EVALUATED" }, orderBy: { submittedAt: "desc" }, take: 6, select: { id: true } })
      : await prisma.speakingSession.findMany({ where: { userId, assessments: { some: {} } }, orderBy: { updatedAt: "desc" }, take: 6, select: { id: true } });
  const recent = attempts.map((a) => a.id);
  for (const w of tracked) {
    const occ = await prisma.weaknessOccurrence.findMany({ where: { weaknessId: w.id, sourceId: { in: recent } }, select: { sourceId: true } });
    const hit = new Set(occ.map((o) => o.sourceId));
    let clean = 0;
    for (const id of recent) {
      if (hit.has(id)) break;
      clean++;
    }
    const status = clean >= 4 ? "RESOLVED" : clean >= 2 ? "IMPROVING" : w.status;
    if (status !== w.status) await prisma.weakness.update({ where: { id: w.id }, data: { status } });
  }
}

/** Saved expressions worth checking in a text: only those whose content words appear, to keep the AI prompt small. */
export async function candidateVocab(userId: string, text: string) {
  const items = await prisma.vocabItem.findMany({ where: { userId }, select: { expression: true }, take: 500 });
  const t = normalize(text);
  return items
    .map((i) => i.expression)
    .filter((e) => {
      const words = normalize(e).split(/[^a-z']+/).filter((w) => w.length >= 4);
      return words.length > 0 && words.some((w) => t.includes(w.slice(0, Math.max(4, w.length - 2))));
    })
    .slice(0, 80);
}

export async function recordVocabUsage(
  userId: string,
  skill: Skill,
  sourceId: string,
  text: string,
  items: { expression: string; verdict: "CORRECT" | "INCORRECT" | "UNNATURAL"; context: string; comment: string }[],
) {
  if (!items.length) return;
  const saved = await prisma.vocabItem.findMany({ where: { userId }, select: { id: true, expression: true } });
  const byExpr = new Map(saved.map((s) => [normalize(s.expression), s.id]));
  for (const it of items) {
    const id = byExpr.get(normalize(it.expression));
    if (!id || !occursIn(text, it.context)) continue; // only real usages of really-saved expressions
    await prisma.vocabUsage.create({ data: { vocabId: id, skill, sourceId, verdict: it.verdict, context: it.context.slice(0, 600), comment: it.comment.slice(0, 600) } });
  }
}

/**
 * The student's most important unresolved weaknesses for a skill, ranked by severity × recent frequency.
 * Used to personalise practice pages and to tell the AI examiner what to monitor.
 */
export async function focusWeaknesses(userId: string, skill: Skill | null, limit = 3) {
  const since = new Date(Date.now() - 60 * 864e5);
  const items = await prisma.weakness.findMany({
    where: { userId, status: { not: "RESOLVED" }, ...(skill ? { skills: { has: skill } } : {}) },
    include: { _count: { select: { occurrences: { where: { createdAt: { gte: since } } } } } },
  });
  return items
    .map((w) => ({ key: w.key, name: w.name, status: w.status, severity: w.severity, practice: w.recommendedPractice, score: w.severity * (1 + w._count.occurrences) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
