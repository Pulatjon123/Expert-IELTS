import "server-only";
import { z } from "zod";
import { generateStructured } from "./claude";
import type { WeekStats } from "../reports";

const NarrativeSchema = z.object({ summary: z.string(), recommendations: z.array(z.string()), goals: z.array(z.string()) });

const SYSTEM = `You are a supportive but honest IELTS coach writing a student's weekly progress report.
You receive measured statistics only. Base every statement on these numbers — never invent scores, counts, or activities that are not in the data, and say clearly when there is too little data to judge.
- summary: 4–6 sentences: what they did, how scores moved versus last week, what improved, what still holds them back.
- recommendations: 3–5 specific, actionable recommendations for next week, tied to their weaknesses and lowest criteria.
- goals: 3 measurable goals for next week.
Scores are AI estimates, not official IELTS results.`;

export async function weeklyNarrative(stats: WeekStats, targetBand: number | null, userId: string) {
  // Only the measured numbers are sent — no essay or transcript text.
  const { ai: _ignored, ...data } = stats;
  void _ignored;
  return generateStructured({
    feature: "weekly_report",
    userId,
    system: SYSTEM,
    prompt: `Target band: ${targetBand ?? "not set"}\n\nWeekly statistics (JSON):\n${JSON.stringify(data)}`,
    schema: NarrativeSchema,
    tier: "fast",
    effort: "low",
    maxTokens: 4000,
  });
}
