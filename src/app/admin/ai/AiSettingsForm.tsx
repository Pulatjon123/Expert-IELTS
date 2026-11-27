"use client";
import { useState } from "react";
import { Alert, Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import { api } from "@/lib/fetcher";
import { MODEL_OPTIONS } from "@/lib/ai/pricing";
import type { AiFeature, AiSettings } from "@/lib/ai/settings";

const FEATURES: { id: AiFeature; label: string }[] = [
  { id: "writing_prep", label: "Writing preparation (analysis, ideas, vocabulary, model essay)" },
  { id: "writing_assess", label: "Writing assessment" },
  { id: "speaking_prep", label: "Speaking preparation" },
  { id: "speaking_assess", label: "Speaking assessment" },
  { id: "interview", label: "AI examiner interview" },
  { id: "band_compare", label: "Band 6/7/8 comparison" },
  { id: "weekly_report", label: "Weekly report" },
  { id: "question_generate", label: "AI question generation" },
  { id: "weakness_exercises", label: "Targeted weakness exercises" },
];

export function AiSettingsForm({ initial }: { initial: AiSettings }) {
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await api("/api/admin/settings", { method: "PUT", json: { ai: v } });
      setMsg({ tone: "success", text: "AI settings saved." });
    } catch (e) {
      setMsg({ tone: "danger", text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-5 p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Primary model (assessment, model essays)</Label>
          <Select value={v.primaryModel} onChange={(e) => setV({ ...v, primaryModel: e.target.value })}>
            {MODEL_OPTIONS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Fast model (examiner follow-ups, annotations)</Label>
          <Select value={v.fastModel} onChange={(e) => setV({ ...v, fastModel: e.target.value })}>
            {MODEL_OPTIONS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label hint="same for every student">AI requests per student per 24 h</Label>
          <Input type="number" min={1} value={v.dailyRequestsPerUser} onChange={(e) => setV({ ...v, dailyRequestsPerUser: Number(e.target.value) })} />
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" checked={v.useFallbacks} onChange={(e) => setV({ ...v, useFallbacks: e.target.checked })} />
          Retry on another model if a request is declined (server-side fallback)
        </label>
      </div>
      <div>
        <h3 className="text-sm font-semibold">Extra instructions per feature</h3>
        <p className="mt-1 text-xs text-muted">Appended to the built-in system prompt. Output formats are enforced by a schema, so these cannot break the app.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.id}>
              <Label>{f.label}</Label>
              <Textarea
                rows={2}
                value={v.instructions[f.id] ?? ""}
                onChange={(e) => setV({ ...v, instructions: { ...v.instructions, [f.id]: e.target.value } })}
              />
            </div>
          ))}
        </div>
      </div>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <Button onClick={save} loading={saving}>Save AI settings</Button>
    </Card>
  );
}
