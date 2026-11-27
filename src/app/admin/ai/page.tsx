import { prisma } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import { getAiSettings } from "@/lib/ai/settings";
import { estimateCost } from "@/lib/ai/pricing";
import { AiSettingsForm } from "./AiSettingsForm";

export default async function Page() {
  const d30 = new Date(Date.now() - 30 * 864e5);
  const [settings, byFeature, failures] = await Promise.all([
    getAiSettings(),
    prisma.aiUsageLog.groupBy({
      by: ["feature", "model"],
      where: { createdAt: { gte: d30 } },
      _sum: { inputTokens: true, outputTokens: true, cachedTokens: true, audioSeconds: true },
      _count: true,
    }),
    prisma.aiUsageLog.findMany({ where: { success: false }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);
  return (
    <div>
      <PageHeader
        title="AI management"
        subtitle="Choose models, set the fair-use limit (identical for every student) and add instructions to the AI prompts. Costs are billed to the owner's API account — never to students."
      />
      <AiSettingsForm initial={settings} />
      <Card className="mt-6 overflow-x-auto p-5">
        <h2 className="font-semibold">Usage — last 30 days</h2>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="py-2">Feature</th>
              <th>Model</th>
              <th className="text-right">Requests</th>
              <th className="text-right">Input tokens</th>
              <th className="text-right">Output tokens</th>
              <th className="text-right">Est. cost</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {byFeature.map((r) => (
              <tr key={`${r.feature}-${r.model}`} className="border-t border-border">
                <td className="py-2">{r.feature}</td>
                <td>{r.model}</td>
                <td className="text-right">{r._count}</td>
                <td className="text-right">{(r._sum.inputTokens ?? 0).toLocaleString()}</td>
                <td className="text-right">{(r._sum.outputTokens ?? 0).toLocaleString()}</td>
                <td className="text-right">
                  {r.model.startsWith("claude") ? `$${estimateCost(r.model, r._sum.inputTokens ?? 0, r._sum.outputTokens ?? 0, r._sum.cachedTokens ?? 0).toFixed(3)}` : `${(r._sum.audioSeconds ?? 0).toFixed(0)} s audio`}
                </td>
              </tr>
            ))}
            {!byFeature.length && (
              <tr>
                <td colSpan={6} className="py-3 text-muted">No AI requests yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
      {failures.length > 0 && (
        <Card className="mt-6 p-5">
          <h2 className="font-semibold">Recent failed requests</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {failures.map((f) => (
              <li key={f.id} className="text-muted">
                {f.createdAt.toLocaleString("en-GB")} · {f.feature} · <span className="text-danger">{f.error}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
