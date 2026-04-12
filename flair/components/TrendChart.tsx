"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { DisparityRatio } from "@/lib/computations";
import { RACE_COLORS } from "@/lib/constants";

interface TrendYear {
  year: number;
  disparityRatios: DisparityRatio[];
}

interface Props {
  trends: TrendYear[];
  lenderName: string;
}

export default function TrendChart({ trends, lenderName }: Props) {
  // Get all groups that appear
  const allGroups = new Set<string>();
  for (const t of trends) {
    for (const r of t.disparityRatios) {
      allGroups.add(r.group);
    }
  }

  // Build chart data: one row per year, one column per group's ratio
  const chartData = trends
    .filter((t) => t.disparityRatios.length > 0)
    .map((t) => {
      const row: Record<string, number | string> = { year: t.year };
      for (const r of t.disparityRatios) {
        row[r.label] = +r.ratio.toFixed(2);
      }
      return row;
    });

  if (chartData.length < 2) {
    return null;
  }

  const groups = trends
    .flatMap((t) => t.disparityRatios)
    .reduce((acc, r) => {
      if (!acc.find((a) => a.group === r.group)) {
        acc.push({ group: r.group, label: r.label });
      }
      return acc;
    }, [] as { group: string; label: string }[]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-1">
        Disparity Trend Over Time
      </h3>
      <p className="text-sm text-slate-500 mb-4">
        Denial rate ratio vs. White applicants at {lenderName}
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="year" tick={{ fontSize: 13 }} />
          <YAxis
            tick={{ fontSize: 13 }}
            tickFormatter={(v) => `${v}x`}
            domain={[0, "auto"]}
          />
          <Tooltip formatter={(value) => [`${value}x`, ""]} />
          <Legend />
          <ReferenceLine y={1} stroke="#94a3b8" strokeDasharray="3 3" label="Parity" />
          {groups.map((g) => (
            <Line
              key={g.group}
              type="monotone"
              dataKey={g.label}
              stroke={RACE_COLORS[g.group] || "#64748b"}
              strokeWidth={2.5}
              dot={{ r: 4 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
