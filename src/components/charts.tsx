"use client";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Two series colours that stay distinguishable in light and dark themes.
export const SERIES = { writing: "#5b8a6a", speaking: "#c9734f", third: "#5b7fa6", fourth: "#9a7bb0" };
const tooltip = { contentStyle: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--text)" } };
const axis = { stroke: "currentColor", fontSize: 11, tickLine: false, axisLine: false } as const;

export function MiniBars({ data }: { data: { label: string; value: number }[] }) {
  return (
    <div className="h-24 text-muted">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="label" {...axis} interval={1} />
          <Tooltip {...tooltip} cursor={{ fill: "var(--surface-2)" }} />
          <Bar dataKey="value" name="Occurrences" fill={SERIES.speaking} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Band scores over time for Writing and Speaking (null = no attempt that day/week). */
export function BandTrend({ data, height = 260 }: { data: { label: string; writing: number | null; speaking: number | null }[]; height?: number }) {
  return (
    <div className="text-muted" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" {...axis} />
          <YAxis domain={[0, 9]} ticks={[0, 3, 5, 6, 7, 8, 9]} {...axis} />
          <Tooltip {...tooltip} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="writing" name="Writing" stroke={SERIES.writing} strokeWidth={2} dot={{ r: 3 }} connectNulls isAnimationActive={false} />
          <Line type="monotone" dataKey="speaking" name="Speaking" stroke={SERIES.speaking} strokeWidth={2} dot={{ r: 3 }} connectNulls isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Average band per criterion. */
export function CriteriaBars({ data, height = 220 }: { data: { label: string; value: number | null }[]; height?: number }) {
  return (
    <div className="text-muted" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis type="number" domain={[0, 9]} ticks={[0, 3, 5, 6, 7, 8, 9]} {...axis} />
          <YAxis type="category" dataKey="label" width={120} {...axis} />
          <Tooltip {...tooltip} cursor={{ fill: "var(--surface-2)" }} />
          <Bar dataKey="value" name="Average band" fill={SERIES.writing} radius={[0, 3, 3, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Weekly activity: sessions per week for Writing and Speaking. */
export function ActivityBars({ data, height = 200 }: { data: { label: string; writing: number; speaking: number }[]; height?: number }) {
  return (
    <div className="text-muted" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" {...axis} />
          <YAxis allowDecimals={false} {...axis} />
          <Tooltip {...tooltip} cursor={{ fill: "var(--surface-2)" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="writing" name="Writing" fill={SERIES.writing} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="speaking" name="Speaking" fill={SERIES.speaking} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
