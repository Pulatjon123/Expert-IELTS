/** Shape of SpeakingSession.interview for AI examiner interviews (mode = INTERVIEW). */

export type InterviewFormat = "full" | "part1" | "part23";
export type InterviewPhase = "part1" | "part2" | "part2_round" | "part3" | "done";

export interface InterviewTurn {
  part: 1 | 2 | 3;
  kind: "question" | "cue_card" | "closing";
  text: string;
  /** For cue cards: the structured card, so the UI can show it like the real test. */
  cueCard?: { prompt: string; bullets: string[] };
  createdAt: string;
}

export interface InterviewState {
  format: InterviewFormat;
  phase: InterviewPhase;
  part1TopicIds: string[];
  part2TopicId: string | null;
  part3TopicId: string | null;
  turns: InterviewTurn[];
}

/** Server-enforced length of each part, so the AI can never run the test too long or too short. */
export const LIMITS = { part1Questions: 8, part1PerTopic: 4, part3Questions: 6 } as const;

export function asInterview(v: unknown): InterviewState | null {
  if (!v || typeof v !== "object" || !Array.isArray((v as InterviewState).turns)) return null;
  return v as InterviewState;
}

/** The turn the student is expected to answer now (null when the examiner has closed the test). */
export function currentTurnIndex(s: InterviewState) {
  const i = s.turns.length - 1;
  return i >= 0 && s.turns[i].kind !== "closing" ? i : null;
}
