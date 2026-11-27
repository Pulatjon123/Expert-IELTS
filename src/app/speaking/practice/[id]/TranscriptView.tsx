"use client";
import { useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Badge, Button, cn } from "@/components/ui";
import { Highlighted, type Mark } from "@/components/Highlighted";
import { api } from "@/lib/fetcher";
import type { RecordingView } from "@/lib/speaking-view";

function ts(sec: number) {
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function MetricsRow({ m }: { m: RecordingView["metrics"] }) {
  if (!m) return null;
  const chips = [
    `${m.durationSec}s`,
    `${m.wordCount} words`,
    `${m.wpm} wpm`,
    m.pauses ? `${m.pauses.count} long pauses${m.pauses.count ? ` (max ${m.pauses.longestSec}s)` : ""}` : null,
    `${m.fillers.count} fillers`,
    m.selfRepetitions.length ? `${m.selfRepetitions.length} self-repetitions` : null,
  ].filter(Boolean) as string[];
  return (
    <div className="flex flex-wrap gap-1.5" title="Measured from your recording's timestamps — not estimated by AI">
      {chips.map((c) => (
        <Badge key={c}>{c}</Badge>
      ))}
    </div>
  );
}

/** Audio player + verbatim, timestamped subtitles. Highlights are overlays: the transcript text itself is never changed. */
export function TranscriptView({ rec, onRetried, sttConfigured }: { rec: RecordingView; onRetried?: () => void; sttConfigured: boolean }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [time, setTime] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const annotations = rec.annotations.filter((a, i, all) => all.findIndex((b) => b.text === a.text && b.kind === a.kind && b.note === a.note) === i);
  const marks: Mark[] = annotations.map((a) => ({ text: a.text, kind: a.kind, note: `${a.note}${a.correction ? ` → ${a.correction}` : ""}` }));
  if (rec.metrics) for (const r of new Set(rec.metrics.selfRepetitions)) marks.push({ text: r, kind: "repetition", note: "Repeated word" });

  return (
    <div className="space-y-3">
      <audio
        ref={audio}
        controls
        preload="metadata"
        src={`/api/speaking/recordings/${rec.id}/audio?v=${encodeURIComponent(rec.createdAt)}`}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        className="h-10 w-full"
      />
      <MetricsRow m={rec.metrics} />
      {rec.transcript == null ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          {sttConfigured ? "Transcript not available yet." : "Transcript unavailable: speech-to-text is not configured on this server. Your audio is saved."}
          {sttConfigured && (
            <Button
              size="sm"
              variant="secondary"
              loading={retrying}
              onClick={async () => {
                setRetrying(true);
                setErr(null);
                try {
                  await api(`/api/speaking/recordings/${rec.id}/transcribe`, { method: "POST" });
                  onRetried?.();
                } catch (e) {
                  setErr((e as Error).message);
                } finally {
                  setRetrying(false);
                }
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Transcribe
            </Button>
          )}
          {err && <span className="text-danger">{err}</span>}
        </div>
      ) : rec.segments.length ? (
        <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
          {rec.segments.map((s, i) => {
            const active = time >= s.start && time < s.end;
            return (
              <button
                key={i}
                onClick={() => {
                  if (audio.current) {
                    audio.current.currentTime = s.start;
                    audio.current.play().catch(() => {});
                  }
                }}
                className={cn("flex w-full gap-3 rounded-md px-2 py-1 text-left text-sm", active ? "bg-primary-soft" : "hover:bg-surface-2")}
              >
                <span className="w-10 shrink-0 font-mono text-xs leading-6 text-muted">{ts(s.start)}</span>
                <Highlighted source={s.text} marks={marks} className="leading-6" />
              </button>
            );
          })}
        </div>
      ) : (
        <Highlighted source={rec.transcript || "(no speech detected)"} marks={marks} className="rounded-lg border border-border p-3 text-sm leading-6" />
      )}
      {annotations.length > 0 && (
        <ul className="space-y-1.5 text-sm">
          {annotations.map((a, i) => (
            <li key={i} className="flex gap-2">
              <mark className={`mark-${a.kind} shrink-0 text-inherit`}>{a.text}</mark>
              <span className="text-muted">
                {a.correction && <span className="font-medium text-success">{a.correction}</span>} {a.note}
              </span>
            </li>
          ))}
        </ul>
      )}
      {rec.transcript != null && <p className="text-xs text-muted">Verbatim machine transcript of your recording. Recognition errors are possible; the text is never edited.</p>}
    </div>
  );
}
