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
    <div>
      {title && (
        <p className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-4">{title}</p>
      )}

      {/* Checkbox filters */}
      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2">
        {allEntries.map((d) => (
          <label
            key={d.group}
            className="flex items-center gap-2 cursor-pointer text-[13px] select-none"
          >
            <input
              type="checkbox"
              checked={!hidden.has(d.group)}
              onChange={() => toggle(d.group)}
              className="accent-[#111] w-3.5 h-3.5"
            />
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: d.fill }}
            />
            <span className={hidden.has(d.group) ? "text-neutral-400" : "text-neutral-700"}>
              {d.label}
            </span>
            <span className="text-neutral-400 text-[11px]">
              ({d.applications.toLocaleString()})
            </span>
            {d.lowSample && (
              <span className="text-[10px] text-neutral-500">
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
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "#737373" }}
            axisLine={{ stroke: "#e5e5e5" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#737373" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            formatter={(value) => [`${value}%`, "Denial Rate"]}
            contentStyle={{
              borderRadius: "2px",
              border: "1px solid #e5e5e5",
              fontSize: "13px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          />
          <Bar dataKey="denialRatePct" radius={[2, 2, 0, 0]} maxBarSize={48}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
