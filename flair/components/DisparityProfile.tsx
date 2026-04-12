"use client";

import { DisparityRatio } from "@/lib/computations";

interface Props {
  ratios: DisparityRatio[];
  lenderName: string;
  state: string;
  year: number;
}

function ratioColor(ratio: number): string {
  if (ratio >= 2.0) return "text-red-700";
  if (ratio >= 1.5) return "text-[#111]";
  if (ratio >= 1.2) return "text-neutral-600";
  return "text-neutral-400";
}

// Real DOJ/CFPB enforcement actions
interface EnforcementCase {
  name: string;
  year: number;
  settlement: string;
  metric: string;
  ratio: number;
}

const DOJ_CASES: EnforcementCase[] = [
  { name: "DOJ v. Bancorpsouth", year: 2016, settlement: "$10.6M", metric: "Black applicants denied at 2.2x the rate of White applicants", ratio: 2.2 },
  { name: "DOJ v. Wells Fargo", year: 2012, settlement: "$175M", metric: "Higher denial rates and pricing disparities for Black/Hispanic borrowers", ratio: 1.5 },
  { name: "DOJ v. Fairway Independent Mortgage", year: 2024, settlement: "$8M", metric: "3x fewer applications from majority-Black neighborhoods vs. peers", ratio: 3.0 },
  { name: "DOJ v. City National Bank", year: 2024, settlement: "$31M", metric: "Only 7% of mortgage loans in majority-Black/Latino census tracts", ratio: 2.0 },
  { name: "DOJ v. Citadel FCU", year: 2024, settlement: "$6.5M", metric: "Peers generated applications at 3x Citadel's rate in majority-minority areas", ratio: 3.0 },
];

function getEnforcementContext(ratio: number): EnforcementCase[] {
  return DOJ_CASES.filter((c) => c.ratio <= ratio).sort((a, b) => b.ratio - a.ratio);
}

export default function DisparityProfile({ ratios, lenderName, state, year }: Props) {
  if (ratios.length === 0) {
    return (
      <p className="text-sm text-neutral-400 py-8">
        Insufficient data to compute disparity ratios. The lender may have
        fewer than 30 applications from non-White racial groups in this geography.
      </p>
    );
  }

  const worst = ratios[0];
  const enforcementCases = getEnforcementContext(worst.ratio);

  return (
    <div className="space-y-8">
      {/* Headline */}
      <div>
        <p className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-2">
          Highest Disparity Ratio
        </p>
        <p className={`text-6xl font-bold tracking-tight ${ratioColor(worst.ratio)}`}>
          {worst.ratio.toFixed(2)}x
        </p>
        <p className="text-base text-neutral-700 mt-3 leading-relaxed max-w-xl">
          <strong>{worst.label}</strong> applicants at{" "}
          <strong>{lenderName}</strong> in {state} were denied at{" "}
          <strong>{worst.ratio.toFixed(1)}x</strong> the rate of White applicants
          in {year}.
        </p>
        <div className="flex gap-6 mt-3 text-[13px] text-neutral-500">
          <span>{worst.label}: {(worst.denialRate * 100).toFixed(1)}%</span>
          <span>White: {(worst.baselineDenialRate * 100).toFixed(1)}%</span>
          <span>{worst.applications.toLocaleString()} applications</span>
        </div>

        {/* Enforcement context */}
        {enforcementCases.length > 0 && (
          <div className="mt-6 pt-6 border-t border-neutral-200">
            <p className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-3">
              Enforcement precedent
            </p>
            <div className="space-y-2">
              {enforcementCases.slice(0, 3).map((c) => (
                <div key={c.name} className="text-[13px] text-neutral-600 flex gap-3">
                  <span className="font-semibold text-[#111] w-14 flex-shrink-0">{c.settlement}</span>
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
        <div>
          <p className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-4">
            All Disparity Ratios
          </p>
          <div className="divide-y divide-neutral-200">
            {ratios.map((r) => (
              <div
                key={r.group}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <span className="text-sm font-medium text-[#111]">{r.label}</span>
                  <span className="text-[13px] text-neutral-400 ml-2">
                    {r.applications.toLocaleString()} apps &middot; {(r.denialRate * 100).toFixed(1)}% denied
                  </span>
                </div>
                <span className={`text-lg font-bold tabular-nums ${ratioColor(r.ratio)}`}>
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
