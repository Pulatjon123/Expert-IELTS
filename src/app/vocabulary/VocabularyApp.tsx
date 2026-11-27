"use client";
import { useMemo, useState } from "react";
import { BookOpenCheck, Check, Layers, Plus, Search, Trash2, Undo2, BarChart3 } from "lucide-react";
import { Alert, Badge, Button, Card, Input, Label, Select, cn } from "@/components/ui";
import { api } from "@/lib/fetcher";

type Verdict = "CORRECT" | "INCORRECT" | "UNNATURAL";
export interface VocabEntry {
  id: string;
  expression: string;
  kind: "WORD" | "COLLOCATION" | "PHRASE";
  uzbek: string | null;
  definition: string | null;
  example: string | null;
  topic: string | null;
  learned: boolean;
  sourceSkill: "WRITING" | "SPEAKING" | null;
  createdAt: string;
  usages: { id: string; skill: "WRITING" | "SPEAKING"; verdict: Verdict; context: string; comment: string | null; createdAt: string }[];
}

const KIND_LABEL = { WORD: "Word", COLLOCATION: "Collocation", PHRASE: "Phrase" } as const;

function usageSummary(e: VocabEntry) {
  const correct = e.usages.filter((u) => u.verdict === "CORRECT").length;
  const wrong = e.usages.length - correct;
  return { correct, wrong, total: e.usages.length, writing: e.usages.filter((u) => u.skill === "WRITING").length, speaking: e.usages.filter((u) => u.skill === "SPEAKING").length };
}

/** Needs practice: never used after a week, or the latest use was incorrect/unnatural. */
function needsPractice(e: VocabEntry) {
  if (!e.usages.length) return Date.now() - new Date(e.createdAt).getTime() > 7 * 864e5;
  return e.usages[0].verdict !== "CORRECT";
}

export function VocabularyApp({ initial }: { initial: VocabEntry[] }) {
  const [items, setItems] = useState(initial);
  const [tab, setTab] = useState<"bank" | "revise" | "usage">("bank");
  const update = (id: string, patch: Partial<VocabEntry>) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1 sm:w-fit">
        {(
          [
            ["bank", `Bank (${items.length})`, Layers],
            ["revise", "Revise", BookOpenCheck],
            ["usage", "Usage dashboard", BarChart3],
          ] as const
        ).map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)} className={cn("flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium", tab === k ? "bg-surface shadow-sm" : "text-muted hover:text-text")}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>
      {tab === "bank" && <Bank items={items} setItems={setItems} update={update} />}
      {tab === "revise" && <Revise items={items} update={update} />}
      {tab === "usage" && <Usage items={items} />}
    </div>
  );
}

function Bank({ items, setItems, update }: { items: VocabEntry[]; setItems: React.Dispatch<React.SetStateAction<VocabEntry[]>>; update: (id: string, p: Partial<VocabEntry>) => void }) {
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState("");
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [adding, setAdding] = useState(false);
  const topics = useMemo(() => [...new Set(items.map((i) => i.topic).filter(Boolean) as string[])].sort(), [items]);
  const shown = items.filter(
    (i) =>
      (!q || `${i.expression} ${i.uzbek ?? ""} ${i.definition ?? ""}`.toLowerCase().includes(q.toLowerCase())) &&
      (!topic || i.topic === topic) &&
      (!kind || i.kind === kind) &&
      (!status || (status === "learned" ? i.learned : status === "learning" ? !i.learned : status === "practice" ? needsPractice(i) : status === "unused" ? !i.usages.length : true)),
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search English, Uzbek or definition" className="pl-9" />
        </div>
        <Select value={topic} onChange={(e) => setTopic(e.target.value)} className="w-auto">
          <option value="">All topics</option>
          {topics.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
        <Select value={kind} onChange={(e) => setKind(e.target.value)} className="w-auto">
          <option value="">All types</option>
          <option value="WORD">Words</option>
          <option value="COLLOCATION">Collocations</option>
          <option value="PHRASE">Phrases</option>
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto">
          <option value="">Any status</option>
          <option value="learning">Still learning</option>
          <option value="learned">Learned</option>
          <option value="practice">Needs practice</option>
          <option value="unused">Never used</option>
        </Select>
        <Button variant="secondary" onClick={() => setAdding((a) => !a)}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
      {adding && <AddForm onAdded={(e) => { setItems((xs) => [e, ...xs]); setAdding(false); }} />}
      {!items.length && (
        <Card className="mt-4 p-8 text-center text-sm text-muted">
          Your bank is empty. Click “Save” next to any vocabulary, collocation or phrase in a Writing or Speaking preparation section — or add your own above.
        </Card>
      )}
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {shown.map((e) => {
          const s = usageSummary(e);
          return (
            <li key={e.id}>
              <Card className="h-full p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{e.expression}</p>
                    {e.uzbek && <p className="text-sm text-accent">{e.uzbek}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="sm"
                      variant={e.learned ? "secondary" : "ghost"}
                      title={e.learned ? "Mark as still learning" : "Mark as learned"}
                      onClick={async () => {
                        await api(`/api/vocab/${e.id}`, { method: "PATCH", json: { learned: !e.learned } });
                        update(e.id, { learned: !e.learned });
                      }}
                    >
                      {e.learned ? <Undo2 className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />} {e.learned ? "Learned" : "Mark learned"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Delete"
                      onClick={async () => {
                        if (!confirm(`Remove “${e.expression}” and its usage history?`)) return;
                        await api(`/api/vocab/${e.id}`, { method: "DELETE" });
                        setItems((xs) => xs.filter((x) => x.id !== e.id));
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-danger" />
                    </Button>
                  </div>
                </div>
                {e.definition && <p className="mt-2 text-sm text-muted">{e.definition}</p>}
                {e.example && <p className="mt-1 text-sm italic">“{e.example}”</p>}
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                  <Badge>{KIND_LABEL[e.kind]}</Badge>
                  {e.topic && <Badge>{e.topic}</Badge>}
                  {s.total ? (
                    <>
                      <Badge tone="success">✓ {s.correct}</Badge>
                      {s.wrong > 0 && <Badge tone="danger">✗ {s.wrong}</Badge>}
                    </>
                  ) : (
                    <Badge tone="warning">not used yet</Badge>
                  )}
                  <span className="text-muted">added {new Date(e.createdAt).toLocaleDateString("en-GB")}</span>
                </div>
                {e.usages.length > 0 && (
                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer text-xs text-muted">Usage history ({e.usages.length})</summary>
                    <ul className="mt-2 space-y-1.5">
                      {e.usages.map((u) => (
                        <li key={u.id}>
                          <Badge tone={u.verdict === "CORRECT" ? "success" : u.verdict === "UNNATURAL" ? "warning" : "danger"}>{u.verdict.toLowerCase()}</Badge>{" "}
                          <span className="text-xs text-muted">{u.skill.toLowerCase()} · {new Date(u.createdAt).toLocaleDateString("en-GB")}</span>
                          <p className="italic">“{u.context}”</p>
                          {u.comment && <p className="text-xs text-muted">{u.comment}</p>}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
      {items.length > 0 && !shown.length && <p className="mt-4 text-sm text-muted">No expressions match these filters.</p>}
    </div>
  );
}

function AddForm({ onAdded }: { onAdded: (e: VocabEntry) => void }) {
  const [v, setV] = useState({ expression: "", kind: "WORD", uzbek: "", definition: "", example: "", topic: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Card className="mt-4 grid gap-3 p-4 md:grid-cols-3">
      <div>
        <Label>Expression</Label>
        <Input value={v.expression} onChange={(e) => setV({ ...v, expression: e.target.value })} />
      </div>
      <div>
        <Label>Type</Label>
        <Select value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value })}>
          <option value="WORD">Word</option>
          <option value="COLLOCATION">Collocation</option>
          <option value="PHRASE">Phrase</option>
        </Select>
      </div>
      <div>
        <Label>Uzbek</Label>
        <Input value={v.uzbek} onChange={(e) => setV({ ...v, uzbek: e.target.value })} />
      </div>
      <div>
        <Label>Definition</Label>
        <Input value={v.definition} onChange={(e) => setV({ ...v, definition: e.target.value })} />
      </div>
      <div>
        <Label>Example sentence</Label>
        <Input value={v.example} onChange={(e) => setV({ ...v, example: e.target.value })} />
      </div>
      <div>
        <Label>Topic</Label>
        <Input value={v.topic} onChange={(e) => setV({ ...v, topic: e.target.value })} placeholder="e.g. Environment" />
      </div>
      {err && (
        <div className="md:col-span-3">
          <Alert tone="danger">{err}</Alert>
        </div>
      )}
      <div className="md:col-span-3">
        <Button
          loading={busy}
          disabled={v.expression.trim().length < 2}
          onClick={async () => {
            setBusy(true);
            setErr(null);
            try {
              const { item } = await api<{ item: Omit<VocabEntry, "usages" | "createdAt"> & { createdAt: string } }>("/api/vocab", {
                method: "POST",
                json: { ...v, uzbek: v.uzbek || null, definition: v.definition || null, example: v.example || null, topic: v.topic || null },
              });
              onAdded({ ...item, usages: [] });
            } catch (e) {
              setErr((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Save expression
        </Button>
      </div>
    </Card>
  );
}

function Revise({ items, update }: { items: VocabEntry[]; update: (id: string, p: Partial<VocabEntry>) => void }) {
  const [onlyLearning, setOnlyLearning] = useState(true);
  const deck = useMemo(() => items.filter((i) => !onlyLearning || !i.learned), [items, onlyLearning]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [direction, setDirection] = useState<"en" | "uz">("en");
  const card = deck.length ? deck[idx % deck.length] : null;

  if (!card)
    return (
      <Card className="p-8 text-center text-sm text-muted">
        {items.length ? "Everything is marked as learned. Untick “only still learning” to revise all of it." : "Save some expressions first, then revise them here."}
        {items.length > 0 && (
          <div className="mt-3">
            <Button variant="secondary" onClick={() => setOnlyLearning(false)}>Revise all</Button>
          </div>
        )}
      </Card>
    );

  const next = () => {
    setRevealed(false);
    setIdx((i) => (i + 1) % Math.max(1, deck.length));
  };
  const front = direction === "en" || !card.uzbek ? card.expression : card.uzbek;

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={onlyLearning} onChange={(e) => { setOnlyLearning(e.target.checked); setIdx(0); }} /> Only “still learning”
        </label>
        <Select value={direction} onChange={(e) => setDirection(e.target.value as "en" | "uz")} className="w-auto">
          <option value="en">English → meaning</option>
          <option value="uz">Uzbek → English</option>
        </Select>
        <span className="ml-auto text-muted">{(idx % deck.length) + 1} / {deck.length}</span>
      </div>
      <Card className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
        <p className="font-display text-3xl font-semibold">{front}</p>
        {revealed ? (
          <div className="mt-5 space-y-2 text-sm">
            {direction === "uz" && card.uzbek && <p className="text-lg font-semibold">{card.expression}</p>}
            {direction === "en" && card.uzbek && <p className="text-lg text-accent">{card.uzbek}</p>}
            {card.definition && <p className="text-muted">{card.definition}</p>}
            {card.example && <p className="italic">“{card.example}”</p>}
          </div>
        ) : (
          <Button variant="secondary" className="mt-6" onClick={() => setRevealed(true)}>Show answer</Button>
        )}
      </Card>
      {revealed && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={next}>Still learning</Button>
          <Button
            onClick={async () => {
              if (!card.learned) {
                await api(`/api/vocab/${card.id}`, { method: "PATCH", json: { learned: true } });
                update(card.id, { learned: true });
              }
              next();
            }}
          >
            I knew it
          </Button>
        </div>
      )}
      <p className="mt-3 text-center text-xs text-muted">Revision builds recognition — the real test is using the expression in your next essay or spoken answer.</p>
    </div>
  );
}

function Usage({ items }: { items: VocabEntry[] }) {
  const all = items.map((i) => ({ i, s: usageSummary(i) }));
  const usedWriting = all.filter((x) => x.s.writing > 0).length;
  const usedSpeaking = all.filter((x) => x.s.speaking > 0).length;
  const correct = all.filter((x) => x.s.correct > 0);
  const incorrect = all.filter((x) => x.s.wrong > 0);
  const never = all.filter((x) => x.s.total === 0);
  const repeated = all.filter((x) => x.s.total >= 3);
  const practice = items.filter(needsPractice);
  const topics = Object.entries(
    items.reduce<Record<string, { saved: number; used: number; correct: number }>>((acc, i) => {
      const t = i.topic || "Other";
      const s = usageSummary(i);
      acc[t] ??= { saved: 0, used: 0, correct: 0 };
      acc[t].saved++;
      if (s.total) acc[t].used++;
      if (s.correct) acc[t].correct++;
      return acc;
    }, {}),
  ).sort((a, b) => b[1].saved - a[1].saved);

  const stats = [
    ["Saved", items.length],
    ["Marked learned", items.filter((i) => i.learned).length],
    ["Used in Writing", usedWriting],
    ["Used in Speaking", usedSpeaking],
    ["Used correctly", correct.length],
    ["Used incorrectly / unnaturally", incorrect.length],
    ["Never used", never.length],
    ["Used 3+ times", repeated.length],
  ] as const;

  const List = ({ title, rows, tone }: { title: string; rows: { i: VocabEntry; note?: string }[]; tone: "success" | "danger" | "warning" }) => (
    <Card className="p-5">
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {rows.slice(0, 12).map(({ i, note }) => (
          <li key={i.id}>
            <Badge tone={tone}>{i.expression}</Badge> {note && <span className="text-muted">{note}</span>}
          </li>
        ))}
        {!rows.length && <li className="text-muted">Nothing here yet.</li>}
      </ul>
    </Card>
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, n]) => (
          <Card key={label} className="p-4">
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{n}</p>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted">
        Usage is checked by the AI examiner when your essays and spoken answers are assessed, and each usage is confirmed against your actual text. Inserting an expression does not count as success — it has to be used accurately and naturally.
      </p>
      <div className="grid gap-4 lg:grid-cols-3">
        <List title="Successfully used" tone="success" rows={correct.map((x) => ({ i: x.i, note: `${x.s.correct}×` }))} />
        <List title="Used incorrectly or unnaturally" tone="danger" rows={incorrect.map((x) => ({ i: x.i, note: x.i.usages.find((u) => u.verdict !== "CORRECT")?.comment ?? undefined }))} />
        <List title="Needs more practice" tone="warning" rows={practice.map((i) => ({ i, note: i.usages.length ? "last use had a problem" : "saved but not used yet" }))} />
      </div>
      <Card className="overflow-x-auto p-5">
        <h3 className="font-semibold">Progress by topic</h3>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="py-1.5">Topic</th>
              <th>Saved</th>
              <th>Used</th>
              <th>Used correctly</th>
              <th className="w-1/3">Progress</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {topics.map(([t, v]) => (
              <tr key={t} className="border-t border-border">
                <td className="py-2">{t}</td>
                <td>{v.saved}</td>
                <td>{v.used}</td>
                <td>{v.correct}</td>
                <td>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full bg-success" style={{ width: `${Math.round((v.correct / v.saved) * 100)}%` }} />
                  </div>
                </td>
              </tr>
            ))}
            {!topics.length && (
              <tr>
                <td colSpan={5} className="py-3 text-muted">No saved expressions yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
