export interface Mark {
  text: string;
  kind: "grammar" | "vocab" | "repetition" | "unnatural" | "good" | "feature" | "limit";
  note?: string;
}

/**
 * Renders `source` verbatim, wrapping the first occurrence of each mark's text in a highlight.
 * The source text itself is never altered — marks that can't be found are simply not shown.
 */
export function Highlighted({ source, marks, className }: { source: string; marks: Mark[]; className?: string }) {
  const lower = source.toLowerCase();
  const spans: { start: number; end: number; mark: Mark }[] = [];
  for (const m of marks) {
    const needle = m.text.trim().toLowerCase();
    if (!needle) continue;
    let from = 0;
    while (from < lower.length) {
      const i = lower.indexOf(needle, from);
      if (i < 0) break;
      const end = i + needle.length;
      if (!spans.some((s) => i < s.end && end > s.start)) {
        spans.push({ start: i, end, mark: m });
        if (m.kind !== "repetition") break;
      }
      from = end;
    }
  }
  spans.sort((a, b) => a.start - b.start);
  const out: React.ReactNode[] = [];
  let pos = 0;
  spans.forEach((s, k) => {
    if (s.start > pos) out.push(source.slice(pos, s.start));
    out.push(
      <mark key={k} className={`mark-${s.mark.kind} text-inherit`} title={s.mark.note}>
        {source.slice(s.start, s.end)}
      </mark>,
    );
    pos = s.end;
  });
  out.push(source.slice(pos));
  return <div className={className}>{out}</div>;
}
