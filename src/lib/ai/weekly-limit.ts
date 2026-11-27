import "server-only";
import { prisma } from "../db";
import { weekStart } from "../stats";
import { AiLimitError } from "./errors";
import { getAiSettings } from "./settings";

export type CheckSkill = "WRITING" | "SPEAKING";

const FEATURE: Record<CheckSkill, "writing_assess" | "speaking_assess"> = { WRITING: "writing_assess", SPEAKING: "speaking_assess" };

/**
 * How many Writing / Speaking checks (AI assessments) a student has used this week.
 * Counted from the AI usage log, so every paid assessment counts once, including re-checks of the same essay.
 * Failed assessments do not count. The week starts on Monday 00:00 (server time), like the weekly reports.
 */
export async function getWeeklyCheckUsage(userId: string, skill: CheckSkill) {
  const settings = await getAiSettings();
  const limit = skill === "WRITING" ? settings.weeklyWritingChecks : settings.weeklySpeakingChecks;
  const since = weekStart(new Date());
  const used = await prisma.aiUsageLog.count({ where: { userId, feature: FEATURE[skill], success: true, createdAt: { gte: since } } });
  const resetsAt = new Date(since);
  resetsAt.setDate(resetsAt.getDate() + 7);
  return { used, limit, remaining: Math.max(0, limit - used), resetsAt };
}

/** Throws a friendly 429 when the student has no checks left this week. The site owner (ADMIN) is never limited. */
export async function assertWeeklyCheckAvailable(userId: string, skill: CheckSkill) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role === "ADMIN") return;
  const { used, limit } = await getWeeklyCheckUsage(userId, skill);
  if (used >= limit) {
    const what = skill === "WRITING" ? "Writing" : "Speaking";
    throw new AiLimitError(
      `You've used all ${limit} ${what} checks for this week (the same limit for every student, to keep the platform free). New checks become available on Monday. Your work is saved — you can request the check then.`,
    );
  }
}
