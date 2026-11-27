"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Input, cn } from "./ui";
import { api } from "@/lib/fetcher";

export interface GoalItem {
  id: string;
  title: string;
  targetDate: string | null;
  done: boolean;
}

export function Goals({ initial, compact = false }: { initial: GoalItem[]; compact?: boolean }) {
  const [goals, setGoals] = useState(initial);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const shown = compact ? goals.filter((g) => !g.done).slice(0, 5) : goals;

  async function add() {
    setBusy(true);
    try {
      const { goal } = await api<{ goal: GoalItem }>("/api/goals", { method: "POST", json: { title, targetDate: date || null } });
      setGoals((g) => [{ ...goal, targetDate: goal.targetDate }, ...g]);
      setTitle("");
      setDate("");
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim().length >= 2) add();
        }}
      >
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Write two Task 2 essays a week" className="flex-1" />
        {!compact && <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="sm:w-44" aria-label="Target date" />}
        <Button type="submit" variant="secondary" loading={busy} disabled={title.trim().length < 2}>
          <Plus className="h-4 w-4" /> Add goal
        </Button>
      </form>
      <ul className="mt-3 space-y-1.5">
        {shown.map((g) => (
          <li key={g.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-2">
            <input
              type="checkbox"
              checked={g.done}
              aria-label={`Mark “${g.title}” as done`}
              onChange={async (e) => {
                const done = e.target.checked;
                setGoals((xs) => xs.map((x) => (x.id === g.id ? { ...x, done } : x)));
                await api(`/api/goals/${g.id}`, { method: "PATCH", json: { done } });
              }}
            />
            <span className={cn("flex-1 text-sm", g.done && "text-muted line-through")}>{g.title}</span>
            {g.targetDate && <span className="text-xs text-muted">{new Date(g.targetDate).toLocaleDateString("en-GB")}</span>}
            <button
              aria-label="Delete goal"
              className="rounded p-1 text-muted hover:text-danger"
              onClick={async () => {
                setGoals((xs) => xs.filter((x) => x.id !== g.id));
                await api(`/api/goals/${g.id}`, { method: "DELETE" });
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
        {!shown.length && <li className="px-2 text-sm text-muted">No open goals. Add one above.</li>}
      </ul>
    </div>
  );
}
