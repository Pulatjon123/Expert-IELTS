import "server-only";
import { prisma } from "./db";

export const DAY = 864e5;

/** Monday 00:00 (server local time) of the week containing `d`. */
export function weekStart(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x;
}

export function lastWeeks(n: number, now = new Date()) {
  const cur = weekStart(now);
  return Array.from({ length: n }, (_, i) => new Date(cur.getTime() - (n - 1 - i) * 7 * DAY));
}

export function weekLabel(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Assessed Writing attempts and Speaking attempts (each assessed attempt counts once) in a time window. */
export async function assessedCounts(userId: string, from: Date, to: Date) {
  const [writing, speaking] = await Promise.all([
    prisma.writingAssessment.count({ where: { attempt: { userId }, createdAt: { gte: from, lt: to } } }),
    prisma.speakingAssessment.count({ where: { session: { userId }, createdAt: { gte: from, lt: to } } }),
  ]);
  return { writing, speaking, total: writing + speaking };
}

export function avg(nums: (number | null | undefined)[]) {
  const v = nums.filter((n): n is number => typeof n === "number");
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
}

/** Provisional speaking band when pronunciation was not assessed (average of three criteria, rounded to .5). */
export function speakingBand(a: { overallBand: number | null; fcBand: number; lrBand: number; graBand: number }) {
  return a.overallBand ?? Math.round(((a.fcBand + a.lrBand + a.graBand) / 3) * 2) / 2;
}
