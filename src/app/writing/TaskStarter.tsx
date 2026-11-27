"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Sparkles, BarChart3, FileText } from "lucide-react";
import { Alert, Button, Card, Select } from "@/components/ui";
import { api } from "@/lib/fetcher";
import { CATEGORY_LABELS, TASK1_CATEGORIES, TASK2_CATEGORIES } from "@/lib/ielts";
import { useI18n } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/dict";

const GENERATABLE_T1 = ["LINE_GRAPH", "BAR_CHART", "PIE_CHART", "TABLE"];

export function TaskStarter({
  task,
  title,
  desc,
  counts,
  signedIn,
  locale,
  aiConfigured,
}: {
  aiConfigured: boolean;
  task: "TASK1" | "TASK2";
  title: string;
  desc: string;
  counts: Record<string, number>;
  signedIn: boolean;
  locale: Locale;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState<"start" | "gen" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cats = task === "TASK1" ? TASK1_CATEGORIES : TASK2_CATEGORIES;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const canGenerate = task === "TASK2" || (category && GENERATABLE_T1.includes(category));

  async function start() {
    if (!signedIn) return router.push("/login?next=/writing");
    setLoading("start");
    setError(null);
    try {
      const { questionId } = await api<{ questionId: string }>(`/api/writing/next?task=${task}${category ? `&category=${category}` : ""}`);
      router.push(`/writing/practice/${questionId}`);
    } catch (e) {
      setError((e as Error).message);
      setLoading(null);
    }
  }

  async function generate() {
    if (!signedIn) return router.push("/login?next=/writing");
    setLoading("gen");
    setError(null);
    try {
      const cat = category || (task === "TASK1" ? "BAR_CHART" : TASK2_CATEGORIES[Math.floor(Math.random() * TASK2_CATEGORIES.length)]);
      const { questionId } = await api<{ questionId: string }>("/api/writing/generate", { method: "POST", json: { task, category: cat } });
      router.push(`/writing/practice/${questionId}`);
    } catch (e) {
      setError((e as Error).message);
      setLoading(null);
    }
  }

  return (
    <Card className="flex flex-col p-6 transition hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-fg">
          {task === "TASK1" ? <BarChart3 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
        </span>
        <div>
          <h2 className="font-display text-2xl font-semibold">{title}</h2>
          <p className="text-xs text-muted">{total} questions in the bank</p>
        </div>
      </div>
      <p className="mt-4 flex-1 text-sm text-muted">{desc}</p>
      <div className="mt-5">
        <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Question type">
          <option value="">{t("writing.allTypes")}</option>
          {cats.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c][locale]} ({counts[c] ?? 0})
            </option>
          ))}
        </Select>
      </div>
      {error && (
        <div className="mt-3">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={start} loading={loading === "start"} size="lg" className="flex-1">
          {t("writing.start")} <ArrowRight className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={generate}
          loading={loading === "gen"}
          disabled={!canGenerate || !aiConfigured}
          title={
            !aiConfigured
              ? t("common.notConfigured")
              : canGenerate
                ? "Create a new AI-generated practice question"
                : "AI generation is available for line, bar, pie and table questions"
          }
        >
          <Sparkles className="h-4 w-4" /> New AI question
        </Button>
      </div>
    </Card>
  );
}
