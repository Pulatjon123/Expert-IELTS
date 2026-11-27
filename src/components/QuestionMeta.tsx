import { BadgeCheck, Sparkles, BookOpen } from "lucide-react";
import { Badge } from "./ui";
import { CATEGORY_LABELS, SOURCE_LABELS } from "@/lib/ielts";
import type { Locale } from "@/lib/i18n/dict";

export function SourceBadge({ source, note, reportedAt, locale }: { source: keyof typeof SOURCE_LABELS; note?: string | null; reportedAt?: Date | string | null; locale: Locale }) {
  const Icon = source === "VERIFIED_REPORT" ? BadgeCheck : source === "AI_GENERATED" ? Sparkles : BookOpen;
  const tone = source === "VERIFIED_REPORT" ? "success" : source === "AI_GENERATED" ? "accent" : "neutral";
  const date = reportedAt ? new Date(reportedAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : null;
  return (
    <span title={note ?? undefined}>
      <Badge tone={tone}>
        <Icon className="h-3.5 w-3.5" /> {SOURCE_LABELS[source][locale]}
        {source === "VERIFIED_REPORT" && date ? ` · ${date}` : ""}
      </Badge>
    </span>
  );
}

export function CategoryBadge({ category, locale }: { category: string; locale: Locale }) {
  return <Badge tone="primary">{CATEGORY_LABELS[category]?.[locale] ?? category}</Badge>;
}
