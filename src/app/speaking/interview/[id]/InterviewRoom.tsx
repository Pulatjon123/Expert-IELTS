"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Trash2, UserRound, Volume2, VolumeX, ArrowRight } from "lucide-react";
import { Alert, Badge, Button, Card, Spinner, cn } from "@/components/ui";
import { api, ApiError } from "@/lib/fetcher";
import { uploadRecording } from "@/lib/upload-recording";
import { useI18n } from "@/lib/i18n/client";
import type { SpeakingSessionView } from "@/lib/speaking-view";
import type { InterviewTurn } from "@/lib/interview-state";
import { AnswerRecorder } from "../../practice/[id]/AnswerRecorder";
import { TranscriptView } from "../../practice/[id]/TranscriptView";
import { SpeakingFeedback } from "../../practice/[id]/SpeakingFeedback";

interface Services {
  stt: boolean;
  ai: boolean;
  pronunciation: boolean;
}

/** Reads the examiner's words aloud with the browser's built-in speech synthesis (free, no server cost). */
function useExaminerVoice() {
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    try {
      setEnabled(localStorage.getItem("ei_examiner_voice") !== "off");
    } catch {}
  }, []);
  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    u.voice = voices.find((v) => v.lang === "en-GB") ?? voices.find((v) => v.lang.startsWith("en")) ?? null;
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }, []);
  const toggle = () =>
    setEnabled((e) => {
      try {
        localStorage.setItem("ei_examiner_voice", e ? "off" : "on");
      } catch {}
      if (e) window.speechSynthesis?.cancel();
      return !e;
    });
  return { enabled, toggle, speak };
}

function ExaminerBubble({ t, onSpeak }: { t: InterviewTurn; onSpeak: () => void }) {
  return (
    <div className="flex gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-fg">
        <UserRound className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs text-muted">
          Examiner · Part {t.part}
          <button onClick={onSpeak} className="rounded p-1 hover:bg-surface-2" aria-label="Read aloud">
            <Volume2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {t.kind === "cue_card" && t.cueCard ? (
          <>
            <p className="mt-1 text-sm">{t.text.split("Here is your topic:")[0]}</p>
            <div className="mt-2 rounded-xl border-2 border-dashed border-border bg-surface-2 p-4">
              <p className="font-semibold">{t.cueCard.prompt}</p>
              <p className="mt-2 text-sm text-muted">You should say:</p>
              <ul className="mt-1 list-disc pl-5 text-sm">{t.cueCard.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
            </div>
          </>
        ) : (
          <p className="mt-1 rounded-2xl rounded-tl-sm bg-surface-2 px-4 py-2.5">{t.text}</p>
        )}
      </div>
    </div>
  );
}

export function InterviewRoom({ initial, services }: { initial: SpeakingSessionView; services: Services }) {
  const { t } = useI18n();
  const router = useRouter();
  const [view, setView] = useState(initial);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<{ msg: string; code?: string } | null>(null);
  const [assessing, setAssessing] = useState(false);
  const voice = useExaminerVoice();
  const bottom = useRef<HTMLDivElement>(null);
  const spokenCount = useRef(initial.interview?.turns.length ?? 0);

  const state = view.interview!;
  const turns = state.turns;
  const last = turns[turns.length - 1];
  const done = state.phase === "done";
  const assessment = view.assessments.find((a) => a.attempt === 1);
  const recFor = (i: number) => view.recordings.filter((r) => r.questionIndex === i).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const currentAnswered = !!recFor(turns.length - 1);

  const refresh = useCallback(async () => setView(await api<SpeakingSessionView>(`/api/speaking/sessions/${view.id}`)), [view.id]);

  // Speak each new examiner turn once, when the voice is on.
  useEffect(() => {
    if (turns.length > spokenCount.current) {
      spokenCount.current = turns.length;
      if (voice.enabled) voice.speak(last.text);
      bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [turns.length, last, voice]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  async function advance() {
    setThinking(true);
    setError(null);
    try {
      await api(`/api/speaking/interview/${view.id}/next`, { method: "POST" });
      await refresh();
    } catch (e) {
      setError({ msg: (e as Error).message, code: e instanceof ApiError ? e.code : undefined });
    } finally {
      setThinking(false);
    }
  }

  async function upload(wav: Blob) {
    await uploadRecording(view.id, wav, 1, turns.length - 1);
    await refresh();
    await advance();
  }

  async function assess() {
    setAssessing(true);
    setError(null);
    try {
      await api(`/api/speaking/sessions/${view.id}/assess`, { method: "POST", json: { attempt: 1 } });
      await refresh();
    } catch (e) {
      setError({ msg: (e as Error).message, code: e instanceof ApiError ? e.code : undefined });
    } finally {
      setAssessing(false);
    }
  }

  const blocked = !services.stt || !services.ai;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-2">
        <Link href="/speaking" className="text-sm text-muted hover:text-text">← {t("speaking.title")}</Link>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={voice.toggle} title="Read the examiner's questions aloud">
            {voice.enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />} Examiner voice
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              if (!confirm("Delete this interview and its recordings?")) return;
              await api(`/api/speaking/sessions/${view.id}`, { method: "DELETE" });
              router.push("/speaking");
              router.refresh();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <Card className="mt-3 flex flex-wrap items-center gap-2 p-4">
        <h1 className="font-display text-xl font-semibold">{t("speaking.interview")}</h1>
        <Badge tone="primary">{state.format === "full" ? "Parts 1–3" : state.format === "part1" ? "Part 1" : "Parts 2–3"}</Badge>
        <span className="ml-auto text-xs text-muted">The examiner will not give feedback during the test — you get a full assessment at the end.</span>
      </Card>

      {blocked && (
        <div className="mt-4">
          <Alert tone="warning" title="The AI examiner is not available yet">
            To understand your answers and ask follow-up questions, the examiner needs {[!services.stt && "speech-to-text", !services.ai && "the Claude AI service"].filter(Boolean).join(" and ")}, which the site owner has not configured yet. You can still record your answer to the first question.
          </Alert>
        </div>
      )}

      <div className="mt-6 space-y-6">
        {turns.map((turn, i) => {
          const rec = recFor(i);
          const isCurrent = i === turns.length - 1 && turn.kind !== "closing";
          return (
            <div key={i} className="space-y-3">
              <ExaminerBubble t={turn} onSpeak={() => voice.speak(turn.text)} />
              {rec && (
                <div className="ml-12 rounded-2xl border border-border bg-surface p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Your answer</p>
                  <TranscriptView rec={rec} sttConfigured={services.stt} onRetried={refresh} />
                </div>
              )}
              {isCurrent && !done && (
                <div className="ml-12">
                  {thinking ? (
                    <p className="flex items-center gap-2 text-sm text-muted">
                      <Spinner className="h-4 w-4" /> The examiner is listening to your answer…
                    </p>
                  ) : currentAnswered ? (
                    <Button onClick={advance} disabled={blocked}>
                      Continue <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <AnswerRecorder isPart2={turn.kind === "cue_card"} hasSaved={false} onSave={upload} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mt-4">
          <Alert tone={error.code ? "warning" : "danger"}>{error.msg}</Alert>
        </div>
      )}

      {done && (
        <div className="mt-8">
          {assessment ? (
            <SpeakingFeedback a={assessment} />
          ) : (
            <Card className={cn("flex flex-col items-center gap-3 p-6 text-center")}>
              <p className="font-semibold">The interview is complete.</p>
              <p className="text-sm text-muted">Get an assessment of your whole performance on the four IELTS Speaking criteria.</p>
              <Button size="lg" onClick={assess} loading={assessing}>
                <BarChart3 className="h-4 w-4" /> Get my assessment
              </Button>
              {assessing && <p className="text-xs text-muted">Assessing all of your answers… this can take a minute.</p>}
            </Card>
          )}
        </div>
      )}
      <div ref={bottom} />
    </div>
  );
}
