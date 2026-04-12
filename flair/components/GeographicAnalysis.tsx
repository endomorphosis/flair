"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface GeographicData {
  lender: {
    majorityMinority: { applications: number; originations: number; denials: number };
    majorityWhite: { applications: number; originations: number; denials: number };
    total: number;
    mmPct: number;
    mmDenialRate: number;
    mwDenialRate: number;
  };
  market: {
    majorityMinority: { applications: number };
    majorityWhite: { applications: number };
    total: number;
    mmPct: number;
  };
  gap: number;
  counties: {
    majorityMinorityCount: number;
    majorityWhiteCount: number;
    totalCounties: number;
  };
}

interface Props {
  lei: string;
  state: string;
  year: number;
  lenderName: string;
  geoLabel: string;
}

export default function GeographicAnalysis({ lei, state, year, lenderName, geoLabel }: Props) {
  const [data, setData] = useState<GeographicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/geographic?lei=${lei}&state=${state}&year=${year}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [lei, state, year]);

  if (loading) {
    return (
      <div>
        <p className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-2">
          Geographic Lending Patterns
        </p>
        <div className="flex items-center gap-2 text-sm text-neutral-400 py-8">
          <div className="w-4 h-4 border-2 border-neutral-300 border-t-[#111] rounded-full animate-spin" />
          Fetching county demographics and lending patterns...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <p className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-2">
          Geographic Lending Patterns
        </p>
        <p className="text-sm text-neutral-500">
          Geographic analysis unavailable: {error || "No data returned"}
        </p>
      </div>
    );
  }

  const chartData = [
    {
      name: "Majority-Minority Counties",
      [lenderName]: +data.lender.mmPct.toFixed(1),
      "Market Average": +data.market.mmPct.toFixed(1),
    },
    {
      name: "Majority-White Counties",
      [lenderName]: +(100 - data.lender.mmPct).toFixed(1),
      "Market Average": +(100 - data.market.mmPct).toFixed(1),
    },
  ];

  const isUnderserving = data.gap < -5;
  const isOverserving = data.gap > 5;

  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-1">
        Geographic Lending Patterns
      </p>
      <p className="text-[13px] text-neutral-400 mb-8">
        Application distribution across majority-minority vs. majority-White
        counties in {geoLabel} ({year})
      </p>

      {/* Headline comparison */}
      <div className="grid grid-cols-2 gap-8 mb-6">
        <div>
          <p className="text-[11px] text-neutral-500 mb-1">{lenderName}</p>
          <p className="text-3xl font-bold text-[#111]">
            {data.lender.mmPct.toFixed(1)}%
          </p>
          <p className="text-[13px] text-neutral-500 mt-1">
            in majority-minority counties
          </p>
        </div>
        <div>
          <p className="text-[11px] text-neutral-500 mb-1">Market Average</p>
          <p className="text-3xl font-bold text-neutral-400">
            {data.market.mmPct.toFixed(1)}%
          </p>
          <p className="text-[13px] text-neutral-500 mt-1">
            in majority-minority counties
          </p>
        </div>
      </div>

      <p className="text-[13px] mb-8">
        {isUnderserving ? (
          <span className="text-red-700 font-medium">
            {lenderName} is {Math.abs(data.gap).toFixed(1)} percentage points
            below the market average in majority-minority counties.
            {Math.abs(data.gap) > 10 &&
              " This gap may indicate potential redlining concerns."}
          </span>
        ) : isOverserving ? (
          <span className="text-neutral-600">
            {lenderName} lends at a higher rate in majority-minority counties
            than the market average (+{data.gap.toFixed(1)} pts).
          </span>
        ) : (
          <span className="text-neutral-600">
            {lenderName}&apos;s lending distribution is roughly in line with the
            market average ({data.gap > 0 ? "+" : ""}{data.gap.toFixed(1)} pts).
          </span>
        )}
      </p>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#737373" }} tickLine={false} axisLine={{ stroke: "#e5e5e5" }} />
          <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12, fill: "#737373" }} tickLine={false} axisLine={false} />
          <Tooltip formatter={(value) => [`${value}%`, ""]} contentStyle={{ borderRadius: "2px", border: "1px solid #e5e5e5", fontSize: "13px" }} />
          <Legend />
          <Bar dataKey={lenderName} fill="#111" radius={[2, 2, 0, 0]} maxBarSize={48} />
          <Bar dataKey="Market Average" fill="#d4d4d4" radius={[2, 2, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>

      {/* Detail stats */}
      <div className="mt-8 grid grid-cols-2 gap-8">
        <div className="border-b border-neutral-200 pb-4">
          <p className="text-sm font-semibold text-[#111] mb-1">Majority-Minority Counties</p>
          <p className="text-[11px] text-neutral-500">
            {data.counties.majorityMinorityCount} counties (&gt;50% non-White)
          </p>
          <p className="text-[13px] text-neutral-500 mt-1">
            {data.lender.majorityMinority.applications.toLocaleString()} applications
            &middot; {data.lender.mmDenialRate.toFixed(1)}% denied
          </p>
        </div>
        <div className="border-b border-neutral-200 pb-4">
          <p className="text-sm font-semibold text-[#111] mb-1">Majority-White Counties</p>
          <p className="text-[11px] text-neutral-500">
            {data.counties.majorityWhiteCount} counties (&gt;50% non-Hispanic White)
          </p>
          <p className="text-[13px] text-neutral-500 mt-1">
            {data.lender.majorityWhite.applications.toLocaleString()} applications
            &middot; {data.lender.mwDenialRate.toFixed(1)}% denied
          </p>
        </div>
      </div>

      <p className="text-[11px] text-neutral-400 mt-6">
        County demographics from U.S. Census ACS 5-Year Estimates (2022).
        Geographic analysis mirrors methodology used in DOJ redlining complaints.
      </p>
    </div>
  );
}
