"use client";
import { useEffect, useState } from "react";
import { BookmarkPlus, Check } from "lucide-react";
import { api } from "@/lib/fetcher";

export interface VocabInput {
  expression: string;
  kind: "WORD" | "COLLOCATION" | "PHRASE";
  uzbek?: string;
  definition?: string;
  example?: string;
  topic?: string;
  sourceSkill: "WRITING" | "SPEAKING";
}

/** The student's saved expressions, plus a function to save a new one to the vocabulary bank. */
export function useSavedVocab() {
  const [saved, setSaved] = useState<Set<string>>(new Set());
  useEffect(() => {
    api<{ expressions: string[] }>("/api/vocab")
      .then((r) => setSaved(new Set(r.expressions.map((e) => e.toLowerCase()))))
      .catch(() => {});
  }, []);
  async function save(item: VocabInput) {
    await api("/api/vocab", { method: "POST", json: item });
    setSaved((s) => new Set(s).add(item.expression.toLowerCase()));
  }
  return { saved, save };
}

export function SaveButton({ isSaved, onSave }: { isSaved: boolean; onSave: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={isSaved || busy}
      onClick={async () => {
        setBusy(true);
        try {
          await onSave();
        } finally {
          setBusy(false);
        }
      }}
      className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary-soft disabled:text-success disabled:hover:bg-transparent"
      aria-label={isSaved ? "Saved to vocabulary bank" : "Save to vocabulary bank"}
    >
      {isSaved ? <Check className="h-3.5 w-3.5" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
      {isSaved ? "Saved" : busy ? "…" : "Save"}
    </button>
  );
}
