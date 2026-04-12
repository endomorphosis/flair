"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { DenialRateEntry } from "@/lib/computations";
import { RACE_COLORS } from "@/lib/constants";

interface Props {
  data: DenialRateEntry[];
  title?: string;
}

export default function DenialRateChart({ data, title }: Props) {
  const chartData = data
    .filter((d) => d.applications >= 30)
    .map((d) => ({
      ...d,
      denialRatePct: +(d.denialRate * 100).toFixed(1),
      fill: RACE_COLORS[d.group] || "#94a3b8",
    }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      {title && (
        <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 13, fill: "#475569" }}
            axisLine={{ stroke: "#cbd5e1" }}
          />
          <YAxis
            tick={{ fontSize: 13, fill: "#475569" }}
            axisLine={{ stroke: "#cbd5e1" }}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            formatter={(value) => [`${value}%`, "Denial Rate"]}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              fontSize: "14px",
            }}
          />
          <Bar dataKey="denialRatePct" radius={[6, 6, 0, 0]} maxBarSize={60}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 flex flex-wrap gap-4 justify-center text-xs text-slate-500">
        {chartData.map((d) => (
          <span key={d.group} className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: d.fill }}
            />
            {d.label}: {d.applications.toLocaleString()} applications
          </span>
        ))}
      </div>
    </div>
  );
}
