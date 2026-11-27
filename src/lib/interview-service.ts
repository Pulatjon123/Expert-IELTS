import "server-only";
import type { Prisma, SpeakingTopic } from "@prisma/client";
import { prisma } from "./db";
import { HttpError } from "./auth";
import { isClaudeConfigured, isSttConfigured } from "./ai/services";
import { AiNotConfiguredError } from "./ai/errors";
import { nextExaminerUtterance, type HistoryItem } from "./ai/examiner";
import { asInterview, currentTurnIndex, LIMITS, type InterviewFormat, type InterviewPhase, type InterviewState, type InterviewTurn } from "./interview-state";
import { transcribeRecording } from "./speaking-service";

async function randomTopics(userId: string, part: number, n: number, exclude: string[] = []) {
  const all = await prisma.speakingTopic.findMany({ where: { part, isActive: true, id: { notIn: exclude } }, select: { id: true } });
  const recent = new Set(
    (await prisma.questionHistory.findMany({ where: { userId, skill: "SPEAKING" }, orderBy: { servedAt: "desc" }, take: 20, select: { questionId: true } })).map((h) => h.questionId),
  );
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  const fresh = shuffled.filter((t) => !recent.has(t.id));
  return [...fresh, ...shuffled.filter((t) => recent.has(t.id))].slice(0, n).map((t) => t.id);
}

function turn(part: 1 | 2 | 3, kind: InterviewTurn["kind"], text: string, cueCard?: InterviewTurn["cueCard"]): InterviewTurn {
  return { part, kind, text, cueCard, createdAt: new Date().toISOString() };
}

function cueCardTurn(t: SpeakingTopic, opening = false): InterviewTurn {
  const intro = opening
    ? "Hello. In this practice test we'll begin with Part 2. I'm going to give you a topic, and I'd like you to talk about it for one to two minutes."
    : "Thank you. Now I'm going to give you a topic, and I'd like you to talk about it for one to two minutes.";
  const text = `${intro} You'll have one minute to think about what you're going to say, and you can make some notes if you wish. Here is your topic: ${t.cueCard}`;
  return turn(2, "cue_card", text, { prompt: t.cueCard ?? "", bullets: t.bulletPoints });
}

const CLOSING = "Thank you. That is the end of the speaking test.";

/** Start an interview. The opening question comes straight from the question bank, so starting costs no AI call. */
export async function startInterview(userId: string, format: InterviewFormat) {
  const part1 = format === "part23" ? [] : await randomTopics(userId, 1, 2);
  const [part2Id] = format === "part1" ? [] : await randomTopics(userId, 2, 1);
  if (format !== "part23" && !part1.length) throw new HttpError(404, "There are no Part 1 questions in the bank yet.");
  if (format !== "part1" && !part2Id) throw new HttpError(404, "There are no Part 2 cue cards in the bank yet.");
  let part3Id: string | null = null;
  if (part2Id) {
    const linked = await prisma.speakingTopic.findFirst({ where: { part: 3, isActive: true, linkedTopicId: part2Id }, select: { id: true } });
    part3Id = linked?.id ?? (await randomTopics(userId, 3, 1))[0] ?? null;
  }
  const first: InterviewTurn =
    format === "part23"
      ? cueCardTurn((await prisma.speakingTopic.findUniqueOrThrow({ where: { id: part2Id } })), true)
      : await (async () => {
          const a = await prisma.speakingTopic.findUniqueOrThrow({ where: { id: part1[0] } });
          return turn(1, "question", `Hello. In this practice test I'd like to ask you some questions about yourself. Let's talk about ${a.title.toLowerCase()}. ${a.questions[0]}`);
        })();
  const state: InterviewState = {
    format,
    phase: format === "part23" ? "part2" : "part1",
    part1TopicIds: part1,
    part2TopicId: part2Id ?? null,
    part3TopicId: part3Id,
    turns: [first],
  };
  const session = await prisma.speakingSession.create({
    data: { userId, mode: "INTERVIEW", part: 0, topicId: part2Id ?? part1[0], interview: state as unknown as Prisma.InputJsonValue },
  });
  await prisma.questionHistory.createMany({
    data: [...part1, part2Id, part3Id].filter(Boolean).map((id) => ({ userId, skill: "SPEAKING" as const, questionId: id! })),
  });
  return session.id;
}

/** After the candidate answers the current question, decide the next step (server-side) and let the AI word the examiner's turn. */
export async function advanceInterview(sessionId: string, userId: string) {
  if (!isSttConfigured()) throw new AiNotConfiguredError("Speech-to-text (STT_API_URL / STT_API_KEY)");
  if (!isClaudeConfigured()) throw new AiNotConfiguredError("Claude AI (ANTHROPIC_API_KEY)");
  const session = await prisma.speakingSession.findFirst({ where: { id: sessionId, userId, mode: "INTERVIEW" } });
  const state = session ? asInterview(session.interview) : null;
  if (!session || !state) throw new HttpError(404, "Interview not found.");
  const idx = currentTurnIndex(state);
  if (idx == null || state.phase === "done") throw new HttpError(409, "This interview has finished.");

  const recs = await prisma.speakingRecording.findMany({ where: { sessionId }, orderBy: { createdAt: "desc" } });
  let current = recs.find((r) => r.questionIndex === idx);
  if (!current) throw new HttpError(409, "Answer the current question first.");
  if (current.transcript == null) current = await transcribeRecording(current.id, userId);

  const answer = (i: number) => recs.find((r) => r.questionIndex === i)?.transcript ?? (i === idx ? current!.transcript : null);
  const history: HistoryItem[] = state.turns.map((t, i) => ({ examiner: t.text, candidate: answer(i) }));
  const asked = state.turns.map((t) => t.text);
  const count = (part: number) => state.turns.filter((t) => t.part === part && t.kind === "question").length;
  const topic = (id: string | null) => (id ? prisma.speakingTopic.findUnique({ where: { id } }) : Promise.resolve(null));
  const unasked = (qs: string[]) => qs.filter((q) => !asked.some((a) => a.includes(q)));

  let next: InterviewTurn;
  let phase: InterviewPhase = state.phase;
  if (state.phase === "part1") {
    const n = count(1);
    if (n < LIMITS.part1Questions) {
      const onSecond = n >= LIMITS.part1PerTopic && state.part1TopicIds.length > 1;
      const t = await topic(state.part1TopicIds[onSecond ? 1 : 0]);
      const switching = n === LIMITS.part1PerTopic && state.part1TopicIds.length > 1;
      const instruction = switching
        ? `Move on to a new Part 1 topic: "${t?.title}". Introduce it briefly (e.g. "Now let's talk about ${t?.title.toLowerCase()}.") and ask its first question.`
        : `Ask the next Part 1 question on the topic "${t?.title}". A very short follow-up to the last answer is allowed only if that answer was very brief.`;
      next = turn(1, "question", await nextExaminerUtterance({ instruction, suggested: unasked(t?.questions ?? []), history, userId }));
    } else if (state.format === "part1") {
      next = turn(1, "closing", CLOSING);
      phase = "done";
    } else {
      const t = await topic(state.part2TopicId);
      next = cueCardTurn(t!);
      phase = "part2";
    }
  } else if (state.phase === "part2") {
    const t = await topic(state.part2TopicId);
    next = turn(2, "question", await nextExaminerUtterance({ instruction: `The candidate has finished their Part 2 talk about "${t?.cueCard}". Thank them briefly and ask ONE short rounding-off question related to their talk.`, suggested: [], history, userId }));
    phase = "part2_round";
  } else if (state.phase === "part2_round" || (state.phase === "part3" && count(3) < LIMITS.part3Questions)) {
    const t = await topic(state.part3TopicId);
    const p2 = await topic(state.part2TopicId);
    const first = state.phase === "part2_round";
    const instruction = first
      ? `Begin Part 3. Say one short transition sentence linking to the Part 2 theme ("${p2?.title}"), e.g. "We've been talking about … and I'd like to discuss with you some more general questions related to this." Then ask the first, fairly general Part 3 question.`
      : `Continue Part 3 (question ${count(3) + 1} of about ${LIMITS.part3Questions}). React to what the candidate just said: ask them to justify or explain, ask for an example, politely challenge their view, or explore another perspective — or move to a new suggested question if that line is exhausted.`;
    next = turn(3, "question", await nextExaminerUtterance({ instruction, suggested: unasked(t?.questions ?? []), history, userId }));
    phase = "part3";
  } else {
    next = turn(3, "closing", CLOSING);
    phase = "done";
  }

  const updated: InterviewState = { ...state, phase, turns: [...state.turns, next] };
  // Optimistic concurrency: only advance if nobody advanced this interview in the meantime.
  const { count: changed } = await prisma.speakingSession.updateMany({
    where: { id: sessionId, updatedAt: session.updatedAt },
    data: { interview: updated as unknown as Prisma.InputJsonValue },
  });
  if (!changed) throw new HttpError(409, "The interview was already advanced. Refresh the page.");
  return updated;
}
