"use client";
import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { Alert, Card, Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/fetcher";

type Ai = { summary: string; recommendations: string[]; goals: string[]; model: string };

/** The AI coach's narrative for a stored report. Written once (on first view) and then saved with the report. */
export function AiSummary({ reportId, initial, aiConfigured }: { reportId: string; initial: Ai | null; aiConfigured: boolean }) {
  const [ai, setAi] = useState(initial);
  const [error, setError] = useState<{ msg: string; code?: string } | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (ai || !aiConfigured || started.current) return;
    started.current = true;
    api<{ ai: Ai }>(`/api/reports/${reportId}/summary`, { method: "POST" })
      .then((r) => setAi(r.ai))
      .catch((e) => setError({ msg: (e as Error).message, code: e instanceof ApiError ? e.code : undefined }));
  }, [ai, aiConfigured, reportId]);

  if (!aiConfigured && !ai) return <Alert tone="neutral">The AI coach summary is not available because the Claude AI service is not configured. All figures below are measured from your results.</Alert>;
  if (error) return <Alert tone={error.code ? "warning" : "danger"}>{error.msg}</Alert>;
  if (!ai)
    return (
      <Card className="flex items-center gap-2 p-5 text-sm text-muted">
        <Spinner className="h-4 w-4" /> Your coach is writing this week&apos;s summary…
      </Card>
    );
  return (
    <Card className="border-primary/30 p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <Sparkles className="h-4 w-4 text-accent" /> Coach&apos;s summary
      </h2>
      <p className="mt-2 text-sm leading-relaxed">{ai.summary}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm">
        <div>
          <p className="font-medium">Personalised recommendations</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">{ai.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </div>
        <div>
          <p className="font-medium">Goals for next week</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">{ai.goals.map((g, i) => <li key={i}>{g}</li>)}</ul>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">Written by {ai.model} from your measured statistics only.</p>
    </Card>
  );
}
