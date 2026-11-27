"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Dumbbell, RotateCcw, XCircle } from "lucide-react";
import { Alert, Button, cn } from "@/components/ui";
import { api, ApiError } from "@/lib/fetcher";
import type { ExerciseSet } from "@/lib/ai/exercises";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9' ]/g, "").replace(/\s+/g, " ").trim();

function Exercise({ ex, n }: { ex: ExerciseSet["exercises"][number]; n: number }) {
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState(false);
  const isChoice = ex.type === "choose" && ex.options.length > 0;
  const correct = checked && norm(value) === norm(ex.answer);
  return (
    <li className="rounded-xl border border-border p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {n}. {ex.instruction}
      </p>
      <p className="mt-1.5">{ex.prompt}</p>
      {isChoice ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {ex.options.map((o) => (
            <button
              key={o}
              onClick={() => {
                setValue(o);
                setChecked(true);
              }}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm",
                checked && o === ex.answer ? "border-success bg-success-soft" : checked && o === value ? "border-danger bg-danger-soft" : "border-border hover:bg-surface-2",
              )}
            >
              {o}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setChecked(false);
            }}
            placeholder="Your answer"
            className="h-10 flex-1 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
          />
          <Button variant="secondary" onClick={() => setChecked(true)} disabled={!value.trim()}>
            Check
          </Button>
        </div>
      )}
      {checked && (
        <div className={cn("mt-3 rounded-lg p-3 text-sm", correct ? "bg-success-soft" : "bg-surface-2")}>
          <p className="flex items-center gap-1.5 font-medium">
            {correct ? <CheckCircle2 className="h-4 w-4 text-success" /> : isChoice ? <XCircle className="h-4 w-4 text-danger" /> : null}
            {correct ? "Correct" : isChoice ? "Not quite" : "Compare with the model answer"}
          </p>
          <p className="mt-1">
            <span className="text-muted">Answer: </span>
            {ex.answer}
          </p>
          <p className="mt-1 text-muted">{ex.explanation}</p>
          {!isChoice && !correct && <p className="mt-1 text-xs text-muted">Other correct wordings are possible — check that your sentence fixes the same problem.</p>}
        </div>
      )}
    </li>
  );
}

export function WeaknessActions({ id, status, aiConfigured }: { id: string; status: string; aiConfigured: boolean }) {
  const router = useRouter();
  const [set, setSet] = useState<ExerciseSet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ msg: string; code?: string } | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setSet((await api<{ set: ExerciseSet }>(`/api/weaknesses/${id}/exercises`, { method: "POST" })).set);
    } catch (e) {
      setError({ msg: (e as Error).message, code: e instanceof ApiError ? e.code : undefined });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={load} loading={loading} disabled={!aiConfigured}>
          <Dumbbell className="h-4 w-4" /> {set ? "New exercise set" : "Practise this weakness"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={async () => {
            await api(`/api/weaknesses/${id}/exercises`, { method: "PATCH", json: { status: status === "RESOLVED" ? "ACTIVE" : "RESOLVED" } });
            router.refresh();
          }}
        >
          {status === "RESOLVED" ? <RotateCcw className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          {status === "RESOLVED" ? "Re-open" : "Mark as resolved"}
        </Button>
        {!aiConfigured && <span className="self-center text-xs text-muted">Targeted exercises need the Claude AI service, which is not configured yet.</span>}
      </div>
      {error && (
        <div className="mt-3">
          <Alert tone={error.code ? "warning" : "danger"}>{error.msg}</Alert>
        </div>
      )}
      {set && (
        <div className="mt-4">
          <p className="text-sm">{set.intro}</p>
          <p className="mt-2 rounded-lg bg-primary-soft p-3 text-sm">
            <span className="font-semibold">Rule: </span>
            {set.rule}
          </p>
          <ol className="mt-3 space-y-3">
            {set.exercises.map((ex, i) => (
              <Exercise key={`${i}-${ex.prompt}`} ex={ex} n={i + 1} />
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
