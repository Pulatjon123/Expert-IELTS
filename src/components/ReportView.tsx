import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { WeekStats } from "@/lib/reports";
import { Badge, BandPill, Card } from "./ui";
import { CriteriaBars } from "./charts";

function Delta({ now, prev }: { now: number | null; prev: number | null }) {
  if (now == null || prev == null) return <span className="text-xs text-muted">no comparison</span>;
  const d = Math.round((now - prev) * 10) / 10;
  const Icon = d > 0 ? ArrowUpRight : d < 0 ? ArrowDownRight : Minus;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${d > 0 ? "text-success" : d < 0 ? "text-danger" : "text-muted"}`}>
      <Icon className="h-3.5 w-3.5" /> {d > 0 ? "+" : ""}
      {d.toFixed(1)} vs last week
    </span>
  );
}

const fmtRange = (s: WeekStats) =>
  `${new Date(s.weekStart).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${new Date(new Date(s.weekEnd).getTime() - 864e5).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;

export function ReportView({ s, aiSlot }: { s: WeekStats; aiSlot?: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">{fmtRange(s)}</p>
      {aiSlot}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Writing performance</h2>
            <BandPill band={s.writing.avgBand} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {s.writing.count} essay{s.writing.count === 1 ? "" : "s"} assessed · {s.writing.words} words written · <Delta now={s.writing.avgBand} prev={s.previous.writingAvg} />
          </p>
          {s.writing.count > 0 && (
            <CriteriaBars
              height={170}
              data={[
                { label: "Task resp./ach.", value: s.writing.criteria.TA },
                { label: "Coherence", value: s.writing.criteria.CC },
                { label: "Vocabulary", value: s.writing.criteria.LR },
                { label: "Grammar", value: s.writing.criteria.GRA },
              ]}
            />
          )}
          <p className="mt-2 text-sm font-medium">Most common mistakes</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {s.mistakes.writing.map((m) => (
              <Badge key={m.name} tone="warning">{m.name} · {m.count}×</Badge>
            ))}
            {!s.mistakes.writing.length && <span className="text-sm text-muted">None recorded.</span>}
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Speaking performance</h2>
            <BandPill band={s.speaking.avgBand} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {s.speaking.count} attempt{s.speaking.count === 1 ? "" : "s"} assessed · {s.speaking.minutes} min recorded · <Delta now={s.speaking.avgBand} prev={s.previous.speakingAvg} />
          </p>
          {s.speaking.count > 0 && (
            <CriteriaBars
              height={170}
              data={[
                { label: "Fluency", value: s.speaking.criteria.FC },
                { label: "Vocabulary", value: s.speaking.criteria.LR },
                { label: "Grammar", value: s.speaking.criteria.GRA },
                { label: "Pronunciation", value: s.speaking.criteria.P },
              ]}
            />
          )}
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-lg bg-surface-2 p-2"><p className="text-xs text-muted">Speed</p><p className="font-semibold tabular-nums">{s.speaking.avgWpm ?? "—"} wpm</p></div>
            <div className="rounded-lg bg-surface-2 p-2"><p className="text-xs text-muted">Fillers / min</p><p className="font-semibold tabular-nums">{s.speaking.fillersPerMin ?? "—"}</p></div>
            <div className="rounded-lg bg-surface-2 p-2"><p className="text-xs text-muted">Long pauses / answer</p><p className="font-semibold tabular-nums">{s.speaking.longPauses ?? "—"}</p></div>
          </div>
          <p className="mt-2 text-xs text-muted">
            Pronunciation: {s.speaking.pronunciation != null ? `${s.speaking.pronunciation}/100 from audio analysis` : "not assessed (no audio pronunciation analysis this week)"}.
          </p>
          <p className="mt-2 text-sm font-medium">Most common speaking weaknesses</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {s.mistakes.speaking.map((m) => (
              <Badge key={m.name} tone="warning">{m.name} · {m.count}×</Badge>
            ))}
            {!s.mistakes.speaking.length && <span className="text-sm text-muted">None recorded.</span>}
          </div>
        </Card>
      </div>
      <Card className="p-5">
        <h2 className="font-semibold">Learning progress</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          {[
            ["New expressions saved", s.vocab.saved],
            ["Used correctly", s.vocab.usedCorrectly],
            ["Collocations used correctly", s.vocab.collocationsCorrect],
            ["Used incorrectly", s.vocab.usedIncorrectly],
          ].map(([l, n]) => (
            <div key={l as string} className="rounded-lg bg-surface-2 p-3">
              <p className="text-xs text-muted">{l}</p>
              <p className="text-xl font-semibold tabular-nums">{n}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3 text-sm">
          <div>
            <p className="font-medium text-success">Weaknesses corrected</p>
            <ul className="mt-1 list-disc pl-5">{s.weaknesses.corrected.map((w) => <li key={w}>{w}</li>)}</ul>
            {!s.weaknesses.corrected.length && <p className="text-muted">None this week.</p>}
          </div>
          <div>
            <p className="font-medium text-warning">Remaining weaknesses</p>
            <ul className="mt-1 list-disc pl-5">{s.weaknesses.remaining.map((w) => <li key={w.name}>{w.name} ({w.count}×)</li>)}</ul>
            {!s.weaknesses.remaining.length && <p className="text-muted">None detected this week.</p>}
          </div>
          <div>
            <p className="font-medium text-primary">Most improved areas</p>
            <ul className="mt-1 list-disc pl-5">{s.mostImproved.map((m) => <li key={m.label}>{m.label} (+{m.delta.toFixed(1)})</li>)}</ul>
            {!s.mostImproved.length && <p className="text-muted">Not enough data to compare with last week.</p>}
          </div>
        </div>
      </Card>
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold">Recommendations</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{s.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
          <p className="mt-2 text-xs text-muted">Based on your tracked weaknesses and this week&apos;s numbers.</p>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">Suggested goals for next week</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{s.goalsNextWeek.map((g, i) => <li key={i}>{g}</li>)}</ul>
        </Card>
      </div>
      <p className="text-center text-xs text-muted">Band scores are AI estimates for practice, not official IELTS results.</p>
    </div>
  );
}
