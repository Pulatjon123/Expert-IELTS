import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HttpError, requireUser } from "@/lib/auth";
import { handler, json } from "@/lib/api";
import { weeklyNarrative } from "@/lib/ai/weekly";
import type { WeekStats } from "@/lib/reports";

export const maxDuration = 120;

/** Add the AI-written summary, recommendations and goals to a stored weekly report (once). */
export const POST = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;
  const report = await prisma.weeklyReport.findFirst({ where: { id, userId: user.id } });
  if (!report) throw new HttpError(404, "Report not found.");
  const stats = report.data as unknown as WeekStats;
  if (stats.ai) return json({ ai: stats.ai });
  if (stats.empty) throw new HttpError(400, "There was no activity this week to summarise.");
  const { data, model } = await weeklyNarrative(stats, user.targetBand, user.id);
  const ai = { ...data, model };
  await prisma.weeklyReport.update({ where: { id }, data: { data: { ...stats, ai } as unknown as Prisma.InputJsonValue } });
  return json({ ai });
});
