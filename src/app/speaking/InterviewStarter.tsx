"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MessagesSquare } from "lucide-react";
import { Alert, Button, Card } from "@/components/ui";
import { api } from "@/lib/fetcher";
import { useI18n } from "@/lib/i18n/client";

const FORMATS = [
  { id: "full", label: "Full test (Parts 1–3)", time: "≈ 11–14 min" },
  { id: "part1", label: "Part 1 only", time: "≈ 4–5 min" },
  { id: "part23", label: "Parts 2 & 3", time: "≈ 8–9 min" },
] as const;

export function InterviewStarter({ signedIn }: { signedIn: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(format: string) {
    if (!signedIn) return router.push("/login?next=/speaking");
    setLoading(format);
    setError(null);
    try {
      const { sessionId } = await api<{ sessionId: string }>("/api/speaking/interview", { method: "POST", json: { format } });
      router.push(`/speaking/interview/${sessionId}`);
    } catch (e) {
      setError((e as Error).message);
      setLoading(null);
    }
  }

  return (
    <Card className="mt-5 p-6">
      <div className="flex items-start gap-4">
        <MessagesSquare className="h-8 w-8 shrink-0 text-accent" />
        <div className="flex-1">
          <h2 className="font-display text-xl font-semibold">{t("speaking.interview")}</h2>
          <p className="mt-1 text-sm text-muted">{t("speaking.interview.desc")}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {FORMATS.map((f) => (
          <Button key={f.id} variant={f.id === "full" ? "primary" : "secondary"} size="lg" className="h-auto flex-col py-3" loading={loading === f.id} disabled={!!loading} onClick={() => start(f.id)}>
            <span>{f.label}</span>
            <span className="text-xs font-normal opacity-80">{f.time}</span>
          </Button>
        ))}
      </div>
      {error && (
        <div className="mt-3">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}
    </Card>
  );
}
