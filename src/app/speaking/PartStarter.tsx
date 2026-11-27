"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Mic } from "lucide-react";
import { Alert, Button, Card } from "@/components/ui";
import { api } from "@/lib/fetcher";
import { useI18n } from "@/lib/i18n/client";

export function PartStarter({ part, title, desc, count, signedIn }: { part: number; title: string; desc: string; count: number; signedIn: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (!signedIn) return router.push("/login?next=/speaking");
    setLoading(true);
    setError(null);
    try {
      const { topicId } = await api<{ topicId: string }>(`/api/speaking/next?part=${part}`);
      const { sessionId } = await api<{ sessionId: string }>("/api/speaking/sessions", { method: "POST", json: { topicId } });
      router.push(`/speaking/practice/${sessionId}`);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <Card className="flex flex-col p-6 transition hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-fg">
        <Mic className="h-5 w-5" />
      </span>
      <h2 className="mt-4 font-display text-xl font-semibold leading-snug">{title}</h2>
      <p className="mt-1 text-xs text-muted">{count} question sets</p>
      <p className="mt-3 flex-1 text-sm text-muted">{desc}</p>
      {error && (
        <div className="mt-3">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}
      <Button className="mt-5" size="lg" onClick={start} loading={loading} disabled={!count}>
        {t("speaking.start")} <ArrowRight className="h-4 w-4" />
      </Button>
    </Card>
  );
}
