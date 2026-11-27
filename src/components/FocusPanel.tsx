import Link from "next/link";
import { Target } from "lucide-react";
import type { Skill } from "@prisma/client";
import { focusWeaknesses } from "@/lib/learning";
import { Badge } from "./ui";

/** "Your personal focus" — built from the student's own tracked weaknesses, no AI call needed. */
export async function FocusPanel({ userId, skill }: { userId: string; skill: Skill }) {
  const items = await focusWeaknesses(userId, skill, 3);
  if (!items.length) return null;
  return (
    <div className="rounded-2xl border border-accent/30 bg-accent-soft p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Target className="h-4 w-4 text-accent" /> Your personal focus for this practice
      </p>
      <ul className="mt-2 space-y-2 text-sm">
        {items.map((w) => (
          <li key={w.key}>
            <span className="font-medium">{w.name}</span>{" "}
            {w.status === "IMPROVING" && <Badge tone="success">improving</Badge>}
            <span className="block text-text/75">{w.practice}</span>
          </li>
        ))}
      </ul>
      <Link href="/weaknesses" className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
        Open your weakness tracker →
      </Link>
    </div>
  );
}
