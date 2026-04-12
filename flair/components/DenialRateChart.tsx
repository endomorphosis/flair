"use client";

import { useState } from "react";
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

const LOW_SAMPLE_THRESHOLD = 30;

export default function DenialRateChart({ data, title }: Props) {
  const allEntries = data.map((d) => ({
    ...d,
    denialRatePct: +(d.denialRate * 100).toFixed(1),
    fill: RACE_COLORS[d.group] || "#94a3b8",
    lowSample: d.applications < LOW_SAMPLE_THRESHOLD,
  }));

  // Default: hide low-sample groups
  const [hidden, setHidden] = useState<Set<string>>(
    () => new Set(allEntries.filter((d) => d.lowSample).map((d) => d.group))
  );

  const chartData = allEntries.filter((d) => !hidden.has(d.group));

  function toggle(group: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      {title && (
        <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>
      )}

      {/* Checkbox filters */}
      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2">
        {allEntries.map((d) => (
          <label
            key={d.group}
            className="flex items-center gap-2 cursor-pointer text-sm select-none"
          >
            <input
              type="checkbox"
              checked={!hidden.has(d.group)}
              onChange={() => toggle(d.group)}
              className="accent-slate-700 w-3.5 h-3.5"
            />
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: d.fill }}
            />
            <span className={hidden.has(d.group) ? "text-slate-400" : "text-slate-700"}>
              {d.label}
            </span>
            <span className="text-slate-400 text-xs">
              ({d.applications.toLocaleString()})
            </span>
            {d.lowSample && (
              <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                n&lt;{LOW_SAMPLE_THRESHOLD}
              </span>
            )}
          </label>
        ))}
      </div>

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
    </div>
  );
}
