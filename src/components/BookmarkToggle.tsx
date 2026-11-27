"use client";
import { useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { api } from "@/lib/fetcher";

export function BookmarkToggle({ topicId, initial, skill = "SPEAKING" }: { topicId: string; initial: boolean; skill?: "WRITING" | "SPEAKING" }) {
  const [on, setOn] = useState(initial);
  return (
    <button
      onClick={async () => setOn((await api<{ bookmarked: boolean }>("/api/bookmarks", { method: "POST", json: { skill, questionId: topicId } })).bookmarked)}
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted hover:bg-surface-2 hover:text-text"
      aria-pressed={on}
    >
      {on ? <BookmarkCheck className="h-4 w-4 text-accent" /> : <Bookmark className="h-4 w-4" />} {on ? "Bookmarked" : "Bookmark"}
    </button>
  );
}
