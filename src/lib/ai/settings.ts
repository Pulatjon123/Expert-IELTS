import "server-only";
import { prisma } from "../db";

export type AiFeature =
  | "writing_prep"
  | "writing_assess"
  | "speaking_prep"
  | "speaking_assess"
  | "transcript_annotate"
  | "interview"
  | "band_compare"
  | "weekly_report"
  | "question_generate"
  | "weakness_exercises";

export interface AiSettings {
  /** Model used for heavy, quality-sensitive work (assessment, model essays). */
  primaryModel: string;
  /** Model used for lighter work (examiner follow-ups, annotations). The owner can point this at a cheaper model. */
  fastModel: string;
  /** Equal for every student: protects the owner's budget, never a paid tier. */
  dailyRequestsPerUser: number;
  /** Writing assessments each student may request per week (Monday–Sunday). Same for everyone; admins are exempt. */
  weeklyWritingChecks: number;
  /** Speaking assessments each student may request per week. A practice set with a second attempt uses two. */
  weeklySpeakingChecks: number;
  /** Server-side fallback on refusals (Claude API only). */
  useFallbacks: boolean;
  /** Extra owner instructions appended to every system prompt, per feature. */
  instructions: Partial<Record<AiFeature, string>>;
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  primaryModel: "claude-sonnet-5-5",
  fastModel: "claude-sonnet-5-5",
  dailyRequestsPerUser: 80,
  weeklyWritingChecks: 3,
  weeklySpeakingChecks: 3,
  useFallbacks: true,
  instructions: {},
};

export async function getAiSettings(): Promise<AiSettings> {
  const row = await prisma.setting.findUnique({ where: { key: "ai" } });
  return { ...DEFAULT_AI_SETTINGS, ...((row?.value as Partial<AiSettings>) ?? {}) };
}

export async function saveAiSettings(patch: Partial<AiSettings>) {
  const current = await getAiSettings();
  const value = { ...current, ...patch };
  await prisma.setting.upsert({ where: { key: "ai" }, create: { key: "ai", value }, update: { value } });
  return value;
}
