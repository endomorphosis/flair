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
      <div className="py-2">
        <h3 className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-2">
          Geographic Lending Pattern Analysis
        </h3>
        <div className="flex items-center gap-2 text-sm text-slate-400 py-8">
          <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          Fetching county demographics and lending patterns...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-2">
        <h3 className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-2">
          Geographic Lending Pattern Analysis
        </h3>
        <p className="text-sm text-amber-600">
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

  const isUnderserving = data.gap < -5; // lender is 5+ pts below market in majority-minority areas
  const isOverserving = data.gap > 5;

  return (
    <div className="py-2">
      <h3 className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-1">
        Geographic Lending Pattern Analysis
      </h3>
      <p className="text-xs text-slate-500 mb-4">
        Application distribution across majority-minority vs. majority-White
        counties in {geoLabel} ({year}) — based on Census ACS county demographics
      </p>

      {/* Headline comparison */}
      <div
        className={`rounded-lg border p-4 mb-5 ${
          isUnderserving
            ? "bg-red-50 border-red-200"
            : isOverserving
            ? "bg-green-50 border-green-200"
            : "bg-slate-50 border-slate-200"
        }`}
      >
        <div className="grid grid-cols-2 gap-4 text-center mb-3">
          <div>
            <p className="text-xs text-slate-500 mb-1">
              {lenderName}
            </p>
            <p className="text-2xl font-bold text-slate-900">
              {data.lender.mmPct.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500">
              of applications in majority-minority counties
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Market Average</p>
            <p className="text-2xl font-bold text-slate-600">
              {data.market.mmPct.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500">
              of applications in majority-minority counties
            </p>
          </div>
        </div>

        <p className="text-sm text-center">
          {isUnderserving ? (
            <span className="text-red-700 font-semibold">
              {lenderName} is {Math.abs(data.gap).toFixed(1)} percentage points
              below the market average in majority-minority counties.
              {Math.abs(data.gap) > 10 &&
                " This gap may indicate potential redlining concerns."}
            </span>
          ) : isOverserving ? (
            <span className="text-green-700">
              {lenderName} lends at a higher rate in majority-minority counties
              than the market average (+{data.gap.toFixed(1)} pts).
            </span>
          ) : (
            <span className="text-slate-600">
              {lenderName}&apos;s lending distribution is roughly in line with the
              market average ({data.gap > 0 ? "+" : ""}{data.gap.toFixed(1)} pts).
            </span>
          )}
        </p>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value) => [`${value}%`, ""]} />
          <Legend />
          <Bar dataKey={lenderName} fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={50} />
          <Bar dataKey="Market Average" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={50} />
        </BarChart>
      </ResponsiveContainer>

      {/* Detail stats */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="font-medium text-slate-800 mb-1">Majority-Minority Counties</p>
          <p className="text-xs text-slate-500">
            {data.counties.majorityMinorityCount} counties (&gt;50% non-White population)
          </p>
          <p className="text-xs text-slate-600 mt-1">
            {lenderName}: {data.lender.majorityMinority.applications.toLocaleString()} applications
            ({data.lender.mmDenialRate.toFixed(1)}% denied)
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="font-medium text-slate-800 mb-1">Majority-White Counties</p>
          <p className="text-xs text-slate-500">
            {data.counties.majorityWhiteCount} counties (&gt;50% non-Hispanic White)
          </p>
          <p className="text-xs text-slate-600 mt-1">
            {lenderName}: {data.lender.majorityWhite.applications.toLocaleString()} applications
            ({data.lender.mwDenialRate.toFixed(1)}% denied)
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-4">
        County demographics from U.S. Census ACS 5-Year Estimates (2022).
        Majority-minority defined as &gt;50% non-Hispanic non-White population.
        Lending data from HMDA. Geographic analysis mirrors methodology used in
        DOJ redlining complaints (e.g., DOJ v. City National Bank, 2024).
      </p>
    </div>
  );
}
