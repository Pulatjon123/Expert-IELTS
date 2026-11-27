"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";
import { Alert, Badge, Button, Card, Input, Label, Select, Spinner, Textarea } from "@/components/ui";
import { api } from "@/lib/fetcher";
import { CATEGORY_LABELS, SOURCE_LABELS, TASK1_CATEGORIES, TASK2_CATEGORIES } from "@/lib/ielts";

type Source = keyof typeof SOURCE_LABELS;
interface WQ {
  id: string;
  task: "TASK1" | "TASK2";
  category: string;
  topic: string;
  prompt: string;
  visual: unknown;
  imageUrl: string | null;
  source: Source;
  sourceNote: string | null;
  reportedAt: string | null;
  isActive: boolean;
  _count?: { attempts: number };
}
interface ST {
  id: string;
  part: number;
  topic: string;
  title: string;
  questions: string[];
  cueCard: string | null;
  bulletPoints: string[];
  linkedTopicId: string | null;
  source: Source;
  sourceNote: string | null;
  reportedAt: string | null;
  isActive: boolean;
  _count?: { sessions: number };
}

const sourceTone = (s: Source) => (s === "VERIFIED_REPORT" ? "success" : s === "AI_GENERATED" ? "accent" : "neutral");

export function QuestionManager() {
  const [tab, setTab] = useState<"writing" | "speaking" | "import">("writing");
  const [writing, setWriting] = useState<WQ[] | null>(null);
  const [speaking, setSpeaking] = useState<ST[] | null>(null);
  const [editingW, setEditingW] = useState<Partial<WQ> | null>(null);
  const [editingS, setEditingS] = useState<Partial<ST> | null>(null);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [w, s] = await Promise.all([api<{ items: WQ[] }>("/api/admin/writing-questions"), api<{ items: ST[] }>("/api/admin/speaking-topics")]);
      setWriting(w.items);
      setSpeaking(s.items);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const fw = useMemo(
    () => writing?.filter((q) => !filter || `${q.topic} ${q.prompt} ${q.category}`.toLowerCase().includes(filter.toLowerCase())),
    [writing, filter],
  );
  const fs = useMemo(
    () => speaking?.filter((q) => !filter || `${q.topic} ${q.title} ${q.questions.join(" ")}`.toLowerCase().includes(filter.toLowerCase())),
    [speaking, filter],
  );

  async function remove(kind: "writing-questions" | "speaking-topics", id: string) {
    if (!confirm("Delete this question permanently? Student attempts linked to it will also be removed.")) return;
    try {
      await api(`/api/admin/${kind}/${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["writing", "speaking", "import"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === t ? "bg-primary text-primary-fg" : "bg-surface-2 text-muted hover:text-text"}`}
          >
            {t === "writing" ? `Writing (${writing?.length ?? "…"})` : t === "speaking" ? `Speaking (${speaking?.length ?? "…"})` : "Bulk import"}
          </button>
        ))}
        {tab !== "import" && (
          <>
            <Input placeholder="Search…" value={filter} onChange={(e) => setFilter(e.target.value)} className="ml-auto max-w-56" />
            <Button
              onClick={() =>
                tab === "writing"
                  ? setEditingW({ task: "TASK2", category: "OPINION", source: "PRACTICE", isActive: true })
                  : setEditingS({ part: 1, source: "PRACTICE", isActive: true, questions: [], bulletPoints: [] })
              }
            >
              <Plus className="h-4 w-4" /> New
            </Button>
          </>
        )}
      </div>
      {error && (
        <div className="mb-4">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}

      {tab === "writing" && editingW && <WritingEditor value={editingW} onClose={() => setEditingW(null)} onSaved={() => { setEditingW(null); load(); }} />}
      {tab === "speaking" && editingS && (
        <SpeakingEditor value={editingS} part2Options={speaking?.filter((s) => s.part === 2) ?? []} onClose={() => setEditingS(null)} onSaved={() => { setEditingS(null); load(); }} />
      )}

      {tab === "writing" &&
        (!fw ? (
          <Spinner />
        ) : (
          <div className="space-y-2">
            {fw.map((q) => (
              <Card key={q.id} className="flex items-start gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="primary">{q.task === "TASK1" ? "Task 1" : "Task 2"}</Badge>
                    <Badge>{CATEGORY_LABELS[q.category]?.en ?? q.category}</Badge>
                    <Badge>{q.topic}</Badge>
                    <Badge tone={sourceTone(q.source)}>{SOURCE_LABELS[q.source].en}</Badge>
                    {!q.isActive && <Badge tone="warning">Hidden</Badge>}
                    {q.imageUrl && <Badge tone="accent">Image</Badge>}
                    <span className="text-xs text-muted">{q._count?.attempts ?? 0} attempts</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm">{q.prompt}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditingW(q)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => remove("writing-questions", q.id)} aria-label="Delete"><Trash2 className="h-4 w-4 text-danger" /></Button>
                </div>
              </Card>
            ))}
          </div>
        ))}

      {tab === "speaking" &&
        (!fs ? (
          <Spinner />
        ) : (
          <div className="space-y-2">
            {fs.map((q) => (
              <Card key={q.id} className="flex items-start gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="primary">Part {q.part}</Badge>
                    <Badge>{q.topic}</Badge>
                    <Badge tone={sourceTone(q.source)}>{SOURCE_LABELS[q.source].en}</Badge>
                    {!q.isActive && <Badge tone="warning">Hidden</Badge>}
                    <span className="text-xs text-muted">{q._count?.sessions ?? 0} sessions</span>
                  </div>
                  <p className="mt-2 text-sm font-medium">{q.title}</p>
                  <p className="mt-0.5 line-clamp-1 text-sm text-muted">{q.part === 2 ? q.cueCard : q.questions.join(" · ")}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditingS(q)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => remove("speaking-topics", q.id)} aria-label="Delete"><Trash2 className="h-4 w-4 text-danger" /></Button>
                </div>
              </Card>
            ))}
          </div>
        ))}

      {tab === "import" && <BulkImport onDone={load} />}
    </div>
  );
}

function SourceFields({ v, set }: { v: { source?: Source; sourceNote?: string | null; reportedAt?: string | null }; set: (p: object) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div>
        <Label>Source label</Label>
        <Select value={v.source} onChange={(e) => set({ source: e.target.value })}>
          {Object.entries(SOURCE_LABELS).map(([k, l]) => (
            <option key={k} value={k}>{l.en}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label hint={v.source === "VERIFIED_REPORT" ? "required" : undefined}>Source note</Label>
        <Input value={v.sourceNote ?? ""} onChange={(e) => set({ sourceNote: e.target.value })} placeholder="e.g. Reported by candidates, Tashkent, Oct 2026" />
      </div>
      <div>
        <Label>Reported date</Label>
        <Input type="date" value={v.reportedAt?.slice(0, 10) ?? ""} onChange={(e) => set({ reportedAt: e.target.value || null })} />
      </div>
    </div>
  );
}

function WritingEditor({ value, onClose, onSaved }: { value: Partial<WQ>; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState<Partial<WQ>>(value);
  const [visualText, setVisualText] = useState(value.visual ? JSON.stringify(value.visual, null, 2) : "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (p: object) => setV((x) => ({ ...x, ...p }));
  const cats = v.task === "TASK1" ? TASK1_CATEGORIES : TASK2_CATEGORIES;

  async function save() {
    setError(null);
    let visual: unknown = null;
    if (visualText.trim()) {
      try {
        visual = JSON.parse(visualText);
      } catch {
        setError("Visual data is not valid JSON.");
        return;
      }
    }
    setSaving(true);
    try {
      const body = { ...v, visual, reportedAt: v.reportedAt || null };
      await api(v.id ? `/api/admin/writing-questions/${v.id}` : "/api/admin/writing-questions", { method: v.id ? "PUT" : "POST", json: body });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mb-6 space-y-4 p-5">
      <h2 className="font-semibold">{v.id ? "Edit Writing question" : "New Writing question"}</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label>Task</Label>
          <Select value={v.task} onChange={(e) => set({ task: e.target.value, category: e.target.value === "TASK1" ? "LINE_GRAPH" : "OPINION" })}>
            <option value="TASK1">Task 1</option>
            <option value="TASK2">Task 2</option>
          </Select>
        </div>
        <div>
          <Label>Question type</Label>
          <Select value={v.category} onChange={(e) => set({ category: e.target.value })}>
            {cats.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c].en}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Topic</Label>
          <Input value={v.topic ?? ""} onChange={(e) => set({ topic: e.target.value })} placeholder="e.g. Environment" />
        </div>
      </div>
      <div>
        <Label>Question text</Label>
        <Textarea rows={5} value={v.prompt ?? ""} onChange={(e) => set({ prompt: e.target.value })} />
      </div>
      <ImageField value={v.imageUrl ?? ""} onChange={(imageUrl) => set({ imageUrl })} />
      {v.task === "TASK1" && (
        <details className="rounded-lg border border-border p-3" open={Boolean(visualText.trim())}>
          <summary className="cursor-pointer text-sm font-medium">Visual data as JSON (optional — instead of an image)</summary>
          <div className="mt-3">
            <Label hint="JSON — line/bar/pie/table/process/map/mixed">Visual data</Label>
            <Textarea rows={8} className="font-mono text-xs" value={visualText} onChange={(e) => setVisualText(e.target.value)} placeholder='{"type":"bar","title":"…","unit":"%","categories":["A","B"],"series":[{"name":"2020","values":[10,20]}]}' />
          </div>
        </details>
      )}
      <SourceFields v={v} set={set} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={v.isActive ?? true} onChange={(e) => set({ isActive: e.target.checked })} /> Visible to students
      </label>
      {error && <Alert tone="danger">{error}</Alert>}
      <div className="flex gap-2">
        <Button onClick={save} loading={saving}>Save</Button>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </Card>
  );
}

/** Upload an image (chart, map, diagram) from the computer, or paste a link to one. */
function ImageField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [link, setLink] = useState("");

  function applyLink() {
    const l = link.trim();
    if (!l) return;
    if (!/^https?:\/\//.test(l)) {
      setError("Havola https:// bilan boshlanishi kerak. / The link must start with https://");
      return;
    }
    setError(null);
    setLink("");
    onChange(l);
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
      setError("Faqat PNG, JPG, WebP yoki GIF rasm. / Only PNG, JPG, WebP or GIF.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("Rasm 4 MB dan katta. / The image is larger than 4 MB.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { url } = await api<{ url: string }>("/api/admin/uploads", { method: "POST", body: fd });
      onChange(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <Label hint="PNG, JPG, WebP, GIF · max 4 MB">Rasm / Image (chart, map, diagram)</Label>
      {value ? (
        <div className="flex flex-wrap items-start gap-4 rounded-lg border border-border p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Question image" className="max-h-56 max-w-full rounded-md border border-border" />
          <div className="flex flex-col gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-2">
              <Upload className="h-4 w-4" /> Almashtirish / Replace
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
            </label>
            <Button variant="secondary" size="sm" onClick={() => onChange("")}>
              <Trash2 className="h-4 w-4" /> O&apos;chirish / Remove
            </Button>
          </div>
        </div>
      ) : (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            upload(e.dataTransfer.files?.[0]);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center text-sm transition ${dragOver ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-2"}`}
        >
          {uploading ? <Spinner /> : <Upload className="h-6 w-6 text-muted" />}
          <span className="font-medium">{uploading ? "Yuklanmoqda… / Uploading…" : "Rasm tanlang yoki shu yerga tashlang"}</span>
          <span className="text-xs text-muted">Choose an image or drop it here</span>
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" disabled={uploading} onChange={(e) => upload(e.target.files?.[0])} />
        </label>
      )}
      {!value && (
        <Input
          className="mt-2"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onBlur={applyLink}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              applyLink();
            }
          }}
          placeholder="…yoki rasm havolasi / or an image link: https://…"
        />
      )}
      {error && (
        <div className="mt-2">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}
    </div>
  );
}

function SpeakingEditor({ value, part2Options, onClose, onSaved }: { value: Partial<ST>; part2Options: ST[]; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState<Partial<ST>>(value);
  const [questionsText, setQuestionsText] = useState((value.questions ?? []).join("\n"));
  const [bulletsText, setBulletsText] = useState((value.bulletPoints ?? []).join("\n"));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (p: object) => setV((x) => ({ ...x, ...p }));
  const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const body = { ...v, questions: lines(questionsText), bulletPoints: lines(bulletsText), reportedAt: v.reportedAt || null, linkedTopicId: v.linkedTopicId || null };
      await api(v.id ? `/api/admin/speaking-topics/${v.id}` : "/api/admin/speaking-topics", { method: v.id ? "PUT" : "POST", json: body });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mb-6 space-y-4 p-5">
      <h2 className="font-semibold">{v.id ? "Edit Speaking set" : "New Speaking set"}</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label>Part</Label>
          <Select value={v.part} onChange={(e) => set({ part: Number(e.target.value) })}>
            <option value={1}>Part 1</option>
            <option value={2}>Part 2 (cue card)</option>
            <option value={3}>Part 3</option>
          </Select>
        </div>
        <div>
          <Label>Topic</Label>
          <Input value={v.topic ?? ""} onChange={(e) => set({ topic: e.target.value })} />
        </div>
        <div>
          <Label>Title</Label>
          <Input value={v.title ?? ""} onChange={(e) => set({ title: e.target.value })} />
        </div>
      </div>
      {v.part === 2 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <Label>Cue card prompt</Label>
            <Input value={v.cueCard ?? ""} onChange={(e) => set({ cueCard: e.target.value })} placeholder="Describe a …" />
          </div>
          <div>
            <Label hint="one per line">“You should say” points</Label>
            <Textarea rows={4} value={bulletsText} onChange={(e) => setBulletsText(e.target.value)} />
          </div>
        </div>
      ) : (
        <div>
          <Label hint="one per line, in interview order">Questions</Label>
          <Textarea rows={6} value={questionsText} onChange={(e) => setQuestionsText(e.target.value)} />
        </div>
      )}
      {v.part === 3 && (
        <div>
          <Label hint="optional">Linked Part 2 cue card</Label>
          <Select value={v.linkedTopicId ?? ""} onChange={(e) => set({ linkedTopicId: e.target.value })}>
            <option value="">— none —</option>
            {part2Options.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </Select>
        </div>
      )}
      <SourceFields v={v} set={set} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={v.isActive ?? true} onChange={(e) => set({ isActive: e.target.checked })} /> Visible to students
      </label>
      {error && <Alert tone="danger">{error}</Alert>}
      <div className="flex gap-2">
        <Button onClick={save} loading={saving}>Save</Button>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </Card>
  );
}

const IMPORT_EXAMPLE = `{
  "writing": [
    { "task": "TASK2", "category": "OPINION", "topic": "Education",
      "prompt": "Some people think ... To what extent do you agree or disagree?",
      "source": "VERIFIED_REPORT", "sourceNote": "Reported by candidates, Nov 2026", "reportedAt": "2026-11-02" }
  ],
  "speaking": [
    { "part": 1, "topic": "Books", "title": "Books", "questions": ["Do you like reading?", "What was the last book you read?"], "source": "PRACTICE" }
  ]
}`;

function BulkImport({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ imported: { writing: number; speaking: number }; errors: { kind: string; index: number; message: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setError(null);
    setResult(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setError("The import data is not valid JSON.");
      return;
    }
    setLoading(true);
    try {
      setResult(await api("/api/admin/import", { method: "POST", json: parsed }));
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <p className="text-sm text-muted">Paste JSON with <code>writing</code> and/or <code>speaking</code> arrays. Each row is validated; invalid rows are skipped and listed below. You can also load a .json file.</p>
      <input
        type="file"
        accept="application/json,.json"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) setText(await f.text());
        }}
        className="text-sm"
      />
      <Textarea rows={14} className="font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} placeholder={IMPORT_EXAMPLE} />
      {error && <Alert tone="danger">{error}</Alert>}
      {result && (
        <Alert tone={result.errors.length ? "warning" : "success"} title={`Imported ${result.imported.writing} writing and ${result.imported.speaking} speaking items`}>
          {result.errors.length > 0 && (
            <ul className="list-disc pl-5">
              {result.errors.map((e, i) => (
                <li key={i}>{e.kind} #{e.index + 1}: {e.message}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}
      <Button onClick={run} loading={loading} disabled={!text.trim()}>
        <Upload className="h-4 w-4" /> Import
      </Button>
    </Card>
  );
}
