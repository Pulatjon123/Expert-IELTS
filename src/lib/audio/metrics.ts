import type { SttResult } from "./stt";

export interface AudioMetrics {
  durationSec: number;
  wordCount: number;
  /** Words per minute over the whole recording (including pauses). */
  wpm: number;
  /** Words per minute while actually speaking (excludes pauses over 0.5 s). */
  articulationWpm: number | null;
  pauses: { count: number; longestSec: number; totalSec: number } | null;
  fillers: { count: number; perMinute: number; items: Record<string, number> };
  /** Immediate word repetitions such as "I I think" or "the the". */
  selfRepetitions: string[];
  /** Fraction of speech segments the recogniser was unsure about (low avg log-probability). */
  lowConfidenceSegments: number | null;
  source: "word-timestamps" | "segments" | "text-only";
}

const FILLERS = ["um", "umm", "uh", "uhm", "er", "erm", "ah", "hmm", "mm"];
const PHRASE_FILLERS = ["you know", "i mean", "kind of", "sort of"];

/** Objective measurements from the recording and its timestamps. Nothing here is estimated by an AI model. */
export function computeMetrics(stt: SttResult, durationSec: number): AudioMetrics {
  const tokens = stt.text.toLowerCase().replace(/[^a-z' -]/g, " ").split(/\s+/).filter(Boolean);
  const wordCount = tokens.length;
  const minutes = Math.max(durationSec, 1) / 60;

  const items: Record<string, number> = {};
  for (const t of tokens) if (FILLERS.includes(t)) items[t] = (items[t] ?? 0) + 1;
  const lowered = ` ${tokens.join(" ")} `;
  for (const p of PHRASE_FILLERS) {
    const n = lowered.split(` ${p} `).length - 1;
    if (n) items[p] = n;
  }
  const fillerCount = Object.values(items).reduce((a, b) => a + b, 0);

  const selfRepetitions: string[] = [];
  for (let i = 1; i < tokens.length; i++) {
    if (tokens[i] === tokens[i - 1] && !FILLERS.includes(tokens[i]) && tokens[i].length > 0) selfRepetitions.push(`${tokens[i]} ${tokens[i]}`);
  }

  let pauses: AudioMetrics["pauses"] = null;
  let articulationWpm: number | null = null;
  let source: AudioMetrics["source"] = "text-only";
  const timeline = stt.words.length ? stt.words : stt.segments.map((s) => ({ start: s.start, end: s.end }));
  if (timeline.length > 1) {
    source = stt.words.length ? "word-timestamps" : "segments";
    const gaps: number[] = [];
    for (let i = 1; i < timeline.length; i++) gaps.push(Math.max(0, timeline[i].start - timeline[i - 1].end));
    // Leading silence before the first word also counts as hesitation.
    gaps.push(Math.max(0, timeline[0].start));
    const threshold = stt.words.length ? 1.0 : 1.5;
    const long = gaps.filter((g) => g >= threshold);
    pauses = {
      count: long.length,
      longestSec: Math.round(Math.max(0, ...gaps) * 10) / 10,
      totalSec: Math.round(long.reduce((a, b) => a + b, 0) * 10) / 10,
    };
    const silent = gaps.filter((g) => g > 0.5).reduce((a, b) => a + b, 0);
    const speaking = Math.max(1, durationSec - silent);
    articulationWpm = Math.round((wordCount / speaking) * 60);
  }

  const withProb = stt.segments.filter((s) => typeof s.avgLogprob === "number");
  const lowConfidenceSegments = withProb.length ? Math.round((withProb.filter((s) => (s.avgLogprob ?? 0) < -0.8).length / withProb.length) * 100) / 100 : null;

  return {
    durationSec: Math.round(durationSec * 10) / 10,
    wordCount,
    wpm: Math.round(wordCount / minutes),
    articulationWpm,
    pauses,
    fillers: { count: fillerCount, perMinute: Math.round((fillerCount / minutes) * 10) / 10, items },
    selfRepetitions: selfRepetitions.slice(0, 20),
    lowConfidenceSegments,
    source,
  };
}
