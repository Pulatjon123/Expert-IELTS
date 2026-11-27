"use client";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Categorical palette that reads in both light and dark themes.
const COLORS = ["#4f7a5e", "#c56f4c", "#5b7fa6", "#b08a3e", "#8a6aa8", "#3f8f8f"];

type Series = { name: string; values: number[] };
type ChartV = { type: "line" | "bar" | "pie"; title?: string; unit?: string; categories: string[]; series: Series[] };
type TableV = { type: "table"; title?: string; columns: string[]; rows: string[][] };
type ProcessV = { type: "process"; title?: string; steps: string[] };
type MapFeature = { name: string; x: number; y: number; w: number; h: number; kind: "water" | "building" | "road" | "green" };
type MapV = { type: "map"; title?: string; panels: { label: string; features: MapFeature[] }[] };
type MixedV = { type: "mixed"; parts: Visual[] };
export type Visual = ChartV | TableV | ProcessV | MapV | MixedV;

const axis = { stroke: "currentColor", fontSize: 12, tickLine: false } as const;

function Chart({ v }: { v: ChartV }) {
  const data = v.categories.map((c, i) => Object.fromEntries([["name", c], ...v.series.map((s) => [s.name, s.values[i]])]));
  if (v.type === "pie") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {v.series.map((s) => (
          <div key={s.name}>
            <p className="text-center text-sm font-semibold">{s.name}</p>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={v.categories.map((c, i) => ({ name: c, value: s.values[i] }))}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={85}
                  stroke="var(--surface)"
                  label={({ value }) => `${value}${v.unit === "%" ? "%" : ""}`}
                  isAnimationActive={false}
                >
                  {v.categories.map((c, i) => (
                    <Cell key={c} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ))}
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs sm:col-span-2">
          {v.categories.map((c, i) => (
            <li key={c} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} /> {c}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  const Comp = v.type === "line" ? LineChart : BarChart;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <Comp data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="name" {...axis} />
        <YAxis {...axis} label={v.unit ? { value: v.unit, angle: -90, position: "insideLeft", fontSize: 11, fill: "currentColor" } : undefined} />
        <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {v.series.map((s, i) =>
          v.type === "line" ? (
            <Line key={s.name} type="linear" dataKey={s.name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
          ) : (
            <Bar key={s.name} dataKey={s.name} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          ),
        )}
      </Comp>
    </ResponsiveContainer>
  );
}

function Table({ v }: { v: TableV }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {v.columns.map((c) => (
              <th key={c} className="border border-border bg-surface-2 px-3 py-2 text-left font-semibold">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {v.rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <td key={j} className={`border border-border px-3 py-2 ${j > 0 ? "tabular-nums" : "font-medium"}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Process({ v }: { v: ProcessV }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-3">
      {v.steps.map((s, i) => (
        <li key={i} className="relative rounded-xl border border-border bg-surface-2 p-3 text-sm">
          <span className="mb-1 block text-xs font-semibold text-primary">Stage {i + 1}</span>
          {s}
        </li>
      ))}
    </ol>
  );
}

const FILL: Record<MapFeature["kind"], string> = { water: "#a5d8ff", building: "#ced4da", road: "#e9ecef", green: "#b2f2bb" };

function MapView({ v }: { v: MapV }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {v.panels.map((p) => {
        const W = Math.max(...p.features.map((f) => f.x + f.w));
        const H = Math.max(...p.features.map((f) => f.y + f.h));
        return (
          <figure key={p.label}>
            <figcaption className="mb-1 text-center text-sm font-semibold">{p.label}</figcaption>
            <svg viewBox={`0 0 ${W * 60} ${H * 50}`} className="w-full rounded-lg border border-border">
              {p.features.map((f) => (
                <g key={f.name}>
                  <rect x={f.x * 60 + 2} y={f.y * 50 + 2} width={f.w * 60 - 4} height={f.h * 50 - 4} rx={6} fill={FILL[f.kind]} stroke="#868e96" strokeWidth={1} />
                  <text x={(f.x + f.w / 2) * 60} y={(f.y + f.h / 2) * 50} textAnchor="middle" dominantBaseline="middle" fontSize={13} fill="#212529">
                    {f.name}
                  </text>
                </g>
              ))}
            </svg>
          </figure>
        );
      })}
    </div>
  );
}

export function Task1Visual({ visual }: { visual: Visual }) {
  const title = "title" in visual ? visual.title : undefined;
  return (
    <figure className="rounded-xl border border-border bg-surface p-4 text-text">
      {title && <figcaption className="mb-3 text-center text-sm font-semibold">{title}</figcaption>}
      {visual.type === "mixed" ? (
        <div className="space-y-6">
          {visual.parts.map((p, i) => (
            <Task1Visual key={i} visual={p} />
          ))}
        </div>
      ) : visual.type === "table" ? (
        <Table v={visual} />
      ) : visual.type === "process" ? (
        <Process v={visual} />
      ) : visual.type === "map" ? (
        <MapView v={visual} />
      ) : (
        <Chart v={visual} />
      )}
    </figure>
  );
}
