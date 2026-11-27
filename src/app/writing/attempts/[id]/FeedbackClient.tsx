"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { Button, Card, cn } from "@/components/ui";
import { api } from "@/lib/fetcher";
import { countWords } from "@/lib/ielts";

export function FeedbackActions({ questionId }: { questionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-2 print:hidden">
      <Button
        loading={busy}
        onClick={async () => {
          setBusy(true);
          await api("/api/writing/attempts", { method: "POST", json: { questionId, fresh: true } });
          router.push(`/writing/practice/${questionId}`);
        }}
      >
        <RotateCcw className="h-4 w-4" /> Rewrite this question
      </Button>
      <Button variant="secondary" onClick={() => window.print()} title="Opens the print dialog — choose “Save as PDF”">
        <Download className="h-4 w-4" /> Download report (PDF)
      </Button>
    </div>
  );
}

export function EssayCompare({ original, improved }: { original: string; improved: string }) {
  const [view, setView] = useState<"side" | "improved">("side");
  return (
    <Card className="mt-6 p-5 sm:p-6 print:break-before-page">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Improved version</h2>
        <div className="flex gap-1 rounded-lg bg-surface-2 p-1 text-sm print:hidden">
          {(["side", "improved"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={cn("rounded-md px-3 py-1", view === v ? "bg-surface shadow-sm" : "text-muted")}>
              {v === "side" ? "Side by side" : "Improved only"}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-xs text-muted">Rewritten about one band higher, keeping your ideas, so you can see realistic next steps. {countWords(improved)} words.</p>
      <div className={cn("mt-4 grid gap-4", view === "side" && "lg:grid-cols-2")}>
        {view === "side" && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Your essay</p>
            <div className="whitespace-pre-line rounded-xl border border-border p-4 font-serif leading-7">{original}</div>
          </div>
        )}
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Improved</p>
          <div className="whitespace-pre-line rounded-xl bg-surface-2 p-4 font-serif leading-7">{improved}</div>
        </div>
      </div>
    </Card>
  );
}
