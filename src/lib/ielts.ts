/**
 * IELTS band rounding: the mean of the criteria is rounded to the nearest half band,
 * with .25 rounding up to .5 and .75 rounding up to the next whole band.
 */
export function roundBand(mean: number): number {
  const whole = Math.floor(mean);
  const frac = mean - whole;
  if (frac < 0.25) return whole;
  if (frac < 0.75) return whole + 0.5;
  return whole + 1;
}

export function overallBand(scores: number[]): number {
  const valid = scores.filter((s) => Number.isFinite(s));
  if (!valid.length) return 0;
  return roundBand(valid.reduce((a, b) => a + b, 0) / valid.length);
}

/** Criterion scores themselves are whole bands (0–9). Clamp anything the model returns. */
export function clampCriterion(n: number): number {
  return Math.max(0, Math.min(9, Math.round(n)));
}

export function countWords(text: string): number {
  const m = text.trim().match(/[A-Za-z0-9’'-]+/g);
  return m ? m.length : 0;
}

export const TASK1_CATEGORIES = ["LINE_GRAPH", "BAR_CHART", "PIE_CHART", "TABLE", "MAP", "PROCESS", "MIXED"] as const;
export const TASK2_CATEGORIES = ["OPINION", "DISCUSSION", "ADV_DISADV", "PROBLEM_SOLUTION", "DIRECT", "TWO_PART"] as const;

export const CATEGORY_LABELS: Record<string, { en: string; uz: string }> = {
  LINE_GRAPH: { en: "Line graph", uz: "Chiziqli grafik" },
  BAR_CHART: { en: "Bar chart", uz: "Ustunli diagramma" },
  PIE_CHART: { en: "Pie chart", uz: "Doiraviy diagramma" },
  TABLE: { en: "Table", uz: "Jadval" },
  MAP: { en: "Map", uz: "Xarita" },
  PROCESS: { en: "Process diagram", uz: "Jarayon diagrammasi" },
  MIXED: { en: "Mixed charts", uz: "Aralash diagrammalar" },
  OPINION: { en: "Opinion", uz: "Fikr bildirish" },
  DISCUSSION: { en: "Discussion", uz: "Muhokama" },
  ADV_DISADV: { en: "Advantages & disadvantages", uz: "Afzallik va kamchiliklar" },
  PROBLEM_SOLUTION: { en: "Problem & solution", uz: "Muammo va yechim" },
  DIRECT: { en: "Direct question", uz: "To‘g‘ridan-to‘g‘ri savol" },
  TWO_PART: { en: "Two-part question", uz: "Ikki qismli savol" },
};

export const SOURCE_LABELS = {
  VERIFIED_REPORT: { en: "Verified exam report", uz: "Tasdiqlangan imtihon hisoboti" },
  AI_GENERATED: { en: "AI-generated practice", uz: "AI yaratgan mashq" },
  PRACTICE: { en: "IELTS-style practice", uz: "IELTS uslubidagi mashq" },
} as const;

export const MIN_WORDS = { TASK1: 150, TASK2: 250 } as const;
export const TIME_LIMIT_MIN = { TASK1: 20, TASK2: 40 } as const;
