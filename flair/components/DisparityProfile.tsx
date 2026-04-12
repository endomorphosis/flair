"use client";

import { DisparityRatio } from "@/lib/computations";

interface Props {
  ratios: DisparityRatio[];
  lenderName: string;
  state: string;
  year: number;
}

function ratioColor(ratio: number): string {
  if (ratio >= 2.0) return "text-red-600";
  if (ratio >= 1.5) return "text-amber-600";
  if (ratio >= 1.2) return "text-yellow-600";
  return "text-green-600";
}

function ratioBg(ratio: number): string {
  if (ratio >= 2.0) return "bg-red-50 border-red-200";
  if (ratio >= 1.5) return "bg-amber-50 border-amber-200";
  if (ratio >= 1.2) return "bg-yellow-50 border-yellow-200";
  return "bg-green-50 border-green-200";
}

function ratioSeverity(ratio: number): string {
  if (ratio >= 2.5) return "Severe disparity";
  if (ratio >= 2.0) return "Significant disparity";
  if (ratio >= 1.5) return "Moderate disparity";
  if (ratio >= 1.2) return "Mild disparity";
  return "Within normal range";
}

// Real DOJ/CFPB enforcement actions with the disparity levels cited
interface EnforcementCase {
  name: string;
  year: number;
  settlement: string;
  metric: string;
  ratio: number; // approximate disparity ratio from the complaint
}

const DOJ_CASES: EnforcementCase[] = [
  {
    name: "DOJ v. Bancorpsouth",
    year: 2016,
    settlement: "$10.6M",
    metric: "Black applicants denied at 2.2x the rate of White applicants",
    ratio: 2.2,
  },
  {
    name: "DOJ v. Wells Fargo",
    year: 2012,
    settlement: "$175M",
    metric: "Higher denial rates and pricing disparities for Black/Hispanic borrowers",
    ratio: 1.5,
  },
  {
    name: "DOJ v. Fairway Independent Mortgage",
    year: 2024,
    settlement: "$8M",
    metric: "3x fewer applications from majority-Black neighborhoods vs. peers",
    ratio: 3.0,
  },
  {
    name: "DOJ v. City National Bank",
    year: 2024,
    settlement: "$31M",
    metric: "Only 7% of mortgage loans in majority-Black/Latino census tracts",
    ratio: 2.0,
  },
  {
    name: "DOJ v. Citadel FCU",
    year: 2024,
    settlement: "$6.5M",
    metric: "Peers generated applications at 3x Citadel's rate in majority-minority areas",
    ratio: 3.0,
  },
];

function getEnforcementContext(ratio: number): EnforcementCase[] {
  // Return cases where the cited disparity was at or below the current ratio
  return DOJ_CASES.filter((c) => c.ratio <= ratio).sort(
    (a, b) => b.ratio - a.ratio
  );
}

export default function DisparityProfile({
  ratios,
  lenderName,
  state,
  year,
}: Props) {
  if (ratios.length === 0) {
    return (
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 text-center text-slate-500">
        Insufficient data to compute disparity ratios. This may mean the lender had
        fewer than 30 applications from non-White racial groups in this state.
      </div>
    );
  }

  const worst = ratios[0];

  return (
    <div className="space-y-4">
      {/* Headline stat */}
      <div
        className={`rounded-xl border-2 p-6 ${ratioBg(worst.ratio)}`}
      >
        <p className="text-sm font-medium text-slate-600 mb-1">
          Highest Disparity Ratio
        </p>
        <p className={`text-4xl font-bold ${ratioColor(worst.ratio)}`}>
          {worst.ratio.toFixed(2)}x
        </p>
        <p className="text-base text-slate-700 mt-2">
          <strong>{worst.label}</strong> applicants at{" "}
          <strong>{lenderName}</strong> in {state} were denied at{" "}
          <strong>{worst.ratio.toFixed(1)}x</strong> the rate of White applicants
          in {year}.
        </p>
        <p className="text-sm text-slate-500 mt-1">
          {worst.label} denial rate: {(worst.denialRate * 100).toFixed(1)}% |
          White denial rate: {(worst.baselineDenialRate * 100).toFixed(1)}% |
          Based on {worst.applications.toLocaleString()} {worst.label} applications
        </p>
        <span
          className={`inline-block mt-3 text-xs font-semibold px-2.5 py-1 rounded-full ${
            worst.ratio >= 2.0
              ? "bg-red-100 text-red-700"
              : worst.ratio >= 1.5
              ? "bg-amber-100 text-amber-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {ratioSeverity(worst.ratio)}
        </span>

        {/* DOJ enforcement context */}
        {getEnforcementContext(worst.ratio).length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-xs font-semibold text-slate-700 mb-2">
              Enforcement Precedent
            </p>
            <p className="text-xs text-slate-600 mb-2">
              This disparity exceeds levels that led to DOJ/CFPB enforcement:
            </p>
            <div className="space-y-1.5">
              {getEnforcementContext(worst.ratio).slice(0, 3).map((c) => (
                <div key={c.name} className="text-xs text-slate-600 flex gap-2">
                  <span className="font-semibold text-slate-800 whitespace-nowrap">
                    {c.settlement}
                  </span>
                  <span>
                    <em>{c.name}</em> ({c.year}) — {c.metric}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* All ratios */}
      {ratios.length > 1 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">
            All Disparity Ratios (vs. White Applicants)
          </h3>
          <div className="space-y-3">
            {ratios.map((r) => (
              <div
                key={r.group}
                className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
              >
                <div>
                  <span className="font-medium text-slate-800">{r.label}</span>
                  <span className="text-sm text-slate-500 ml-2">
                    ({r.applications.toLocaleString()} apps, {(r.denialRate * 100).toFixed(1)}% denied)
                  </span>
                </div>
                <span
                  className={`text-xl font-bold ${ratioColor(r.ratio)}`}
                >
                  {r.ratio.toFixed(2)}x
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
