"use client";
import { useEffect, useState } from "react";
import { Mic, Pause, Play, Square, RotateCcw, Upload, Timer } from "lucide-react";
import { Alert, Button, cn } from "@/components/ui";
import { fmt, useRecorder } from "@/lib/recorder";
import { useI18n } from "@/lib/i18n/client";

/**
 * Record one answer: start → pause/resume → stop → listen back → re-record or save.
 * Part 2 adds a 1-minute preparation countdown with a notes box and a 2-minute speaking limit.
 */
export function AnswerRecorder({
  isPart2,
  onSave,
  hasSaved,
}: {
  isPart2: boolean;
  onSave: (wav: Blob) => Promise<void>;
  hasSaved: boolean;
}) {
  const { t } = useI18n();
  const maxSec = isPart2 ? 120 : 300;
  const r = useRecorder({ maxSec });
  const [prepLeft, setPrepLeft] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [open, setOpen] = useState(!hasSaved);

  useEffect(() => {
    if (prepLeft == null || prepLeft <= 0) return;
    const tm = setTimeout(() => setPrepLeft((p) => (p == null ? p : p - 1)), 1000);
    return () => clearTimeout(tm);
  }, [prepLeft]);
  useEffect(() => {
    if (prepLeft === 0) {
      setPrepLeft(null);
      r.start();
    }
  }, [prepLeft, r]);

  async function save() {
    if (!r.result) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(r.result.wav);
      r.reset();
      setOpen(false);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <RotateCcw className="h-4 w-4" /> {t("speaking.rerecord")}
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface-2/60 p-4">
      {isPart2 && (r.state === "idle" || prepLeft != null) && (
        <div className="mb-4">
          {prepLeft != null ? (
            <p className="flex items-center gap-2 text-sm font-medium">
              <Timer className="h-4 w-4 text-accent" /> Preparation time: <span className="tabular-nums">{fmt(prepLeft)}</span>
              <button className="ml-auto text-xs text-primary hover:underline" onClick={() => setPrepLeft(0)}>
                Start speaking now
              </button>
            </p>
          ) : (
            <Button variant="secondary" onClick={() => setPrepLeft(60)}>
              <Timer className="h-4 w-4" /> Start 1-minute preparation
            </Button>
          )}
          {(prepLeft != null || notes) && (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Make notes here (not saved or assessed — as in the exam, notes are just for you)"
              className="mt-3 w-full rounded-lg border border-border bg-surface p-3 text-sm outline-none focus:border-primary"
            />
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {r.state === "idle" && prepLeft == null && (
          <Button onClick={r.start}>
            <Mic className="h-4 w-4" /> {t("speaking.record")}
          </Button>
        )}
        {(r.state === "recording" || r.state === "paused") && (
          <>
            <span className={cn("flex items-center gap-2 text-sm font-semibold tabular-nums", r.state === "recording" ? "text-danger" : "text-muted")}>
              <span className={cn("h-2.5 w-2.5 rounded-full", r.state === "recording" ? "animate-pulse bg-danger" : "bg-muted")} />
              {fmt(r.elapsed)} {isPart2 && <span className="font-normal text-muted">/ 2:00</span>}
            </span>
            <span className="h-2 w-24 overflow-hidden rounded-full bg-border" aria-hidden>
              <span className="block h-full bg-success transition-[width] duration-75" style={{ width: `${Math.min(100, r.level * 160)}%` }} />
            </span>
            {r.state === "recording" ? (
              <Button variant="secondary" size="sm" onClick={r.pause}>
                <Pause className="h-4 w-4" /> {t("speaking.pause")}
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={r.resume}>
                <Play className="h-4 w-4" /> {t("speaking.resume")}
              </Button>
            )}
            <Button variant="danger" size="sm" onClick={r.stop}>
              <Square className="h-4 w-4" /> {t("speaking.stop")}
            </Button>
            {isPart2 && r.elapsed >= 60 && r.elapsed < 110 && <span className="text-xs text-muted">Keep going — aim for the full two minutes.</span>}
          </>
        )}
        {r.state === "processing" && <span className="text-sm text-muted">Processing audio…</span>}
        {r.state === "stopped" && r.result && (
          <>
            <audio controls src={r.result.url} className="h-10 max-w-full" />
            <span className="text-xs text-muted">{fmt(r.result.duration)}</span>
            <Button variant="secondary" size="sm" onClick={r.reset}>
              <RotateCcw className="h-4 w-4" /> {t("speaking.rerecord")}
            </Button>
            <Button size="sm" onClick={save} loading={saving}>
              <Upload className="h-4 w-4" /> {t("speaking.saveAudio")}
            </Button>
          </>
        )}
        {hasSaved && r.state === "idle" && prepLeft == null && (
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
        )}
      </div>
      {(r.error || saveError) && (
        <div className="mt-3">
          <Alert tone="danger">{r.error || saveError}</Alert>
        </div>
      )}
    </div>
  );
}
