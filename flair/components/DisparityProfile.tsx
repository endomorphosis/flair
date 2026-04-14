"use client";

import { DisparityRatio } from "@/lib/computations";

interface Props {
  ratios: DisparityRatio[];
  lenderName: string;
  state: string;
  yearLabel: string;
}

function ratioColor(ratio: number): string {
  if (ratio >= 2.0) return "text-red-700";
  if (ratio >= 1.5) return "text-[#111]";
  if (ratio >= 1.2) return "text-neutral-600";
  return "text-neutral-400";
}

function evidenceBadge(r: DisparityRatio): { label: string; style: string } | null {
  const sig = r.chiSquare?.significant ?? false;
  const pVal = r.chiSquare?.pValue ?? null;
  const vSig = pVal !== null && pVal < 0.01;
  if (r.ratio >= 2.0 && vSig)  return { label: "High risk · p<.01", style: "bg-red-100 text-red-800 border border-red-200" };
  if (r.ratio >= 2.0 && sig)   return { label: "High risk · p<.05", style: "bg-red-100 text-red-700 border border-red-200" };
  if (r.ratio >= 1.5 && vSig)  return { label: "Elevated · p<.01", style: "bg-orange-100 text-orange-800 border border-orange-200" };
  if (r.ratio >= 1.5 && sig)   return { label: "Elevated · p<.05", style: "bg-orange-100 text-orange-700 border border-orange-200" };
  if (r.ratio >= 1.5)           return { label: "Elevated · not sig", style: "bg-amber-50 text-amber-700 border border-amber-200" };
  if (r.ratio >= 1.2 && sig)   return { label: "Moderate · p<.05", style: "bg-amber-50 text-amber-700 border border-amber-200" };
  if (r.ratio >= 1.2)           return { label: "Moderate", style: "bg-neutral-100 text-neutral-600 border border-neutral-200" };
  return null;
}

function sigStars(r: DisparityRatio): string {
  const p = r.chiSquare?.pValue ?? null;
  if (p === null) return "";
  if (p < 0.01) return "★★";
  if (p < 0.05) return "★";
  return "";
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
  { name: "DOJ v. Bancorpsouth", year: 2016, settlement: "$10.6M", metric: "African American applicants denied at 2.2x the rate of White applicants", ratio: 2.2 },
  { name: "DOJ v. Wells Fargo", year: 2012, settlement: "$175M", metric: "Higher denial rates and pricing disparities for African American/Hispanic borrowers", ratio: 1.5 },
  { name: "DOJ v. Fairway Independent Mortgage", year: 2024, settlement: "$8M", metric: "3x fewer applications from majority-African American neighborhoods vs. peers", ratio: 3.0 },
  { name: "DOJ v. City National Bank", year: 2024, settlement: "$31M", metric: "Only 7% of mortgage loans in majority-African American/Latino census tracts", ratio: 2.0 },
  { name: "DOJ v. Citadel FCU", year: 2024, settlement: "$6.5M", metric: "Peers generated applications at 3x Citadel's rate in majority-minority areas", ratio: 3.0 },
];

function getEnforcementContext(ratio: number): EnforcementCase[] {
  return DOJ_CASES.filter((c) => c.ratio <= ratio).sort((a, b) => b.ratio - a.ratio);
}

// ─── CI bar ───────────────────────────────────────────────────────────────────

function CIBar({ lower, upper, ratio }: { lower: number; upper: number; ratio: number }) {
  // Clamp display range to [0.5, 4.0]
  const minV = 0.5;
  const maxV = 4.0;
  const span = maxV - minV;
  const pct = (v: number) => ((Math.min(Math.max(v, minV), maxV) - minV) / span) * 100;
  const excludesOne = lower > 1.0;
  return (
    <div className="relative h-1.5 bg-neutral-100 rounded-full w-full mt-1" title={`95% CI [${lower.toFixed(2)}x–${upper.toFixed(2)}x]`}>
      {/* 1.0 reference line */}
      <span className="absolute top-0 bottom-0 w-px bg-neutral-400" style={{ left: `${pct(1.0)}%` }} />
      {/* CI bar */}
      <span
        className={`absolute top-0 h-full rounded-full ${excludesOne ? "bg-red-400" : "bg-neutral-400"}`}
        style={{ left: `${pct(lower)}%`, width: `${pct(upper) - pct(lower)}%` }}
      />
      {/* Ratio point */}
      <span
        className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 border-white ${excludesOne ? "bg-red-700" : "bg-neutral-500"}`}
        style={{ left: `${pct(ratio)}%`, transform: "translate(-50%, -50%)" }}
      />
    </div>
  );
}

export default function DisparityProfile({ ratios, lenderName, state, yearLabel }: Props) {
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
  const badge = evidenceBadge(worst);

  return (
    <div className="space-y-8">
      {/* Headline */}
      <div>
        <p className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-2">
          Highest Disparity Ratio
        </p>
        <div className="flex items-end gap-4 flex-wrap">
          <p className={`text-6xl font-bold tracking-tight ${ratioColor(worst.ratio)}`}>
            {worst.ratio.toFixed(2)}x
          </p>
          {sigStars(worst) && (
            <span className="text-2xl text-red-700 font-bold mb-1" title="Statistically significant (chi-square)">
              {sigStars(worst)}
            </span>
          )}
          {badge && (
            <span className={`rounded px-2.5 py-1 text-[11px] font-semibold tracking-wide ${badge.style} mb-1`}>
              {badge.label}
            </span>
          )}
        </div>
        <p className="text-base text-neutral-700 mt-3 leading-relaxed max-w-xl">
          <strong>{worst.label}</strong> applicants at{" "}
          <strong>{lenderName}</strong> in {state} were denied at{" "}
          <strong>{worst.ratio.toFixed(1)}x</strong> the rate of White applicants
          in {yearLabel}.
        </p>
        <div className="flex flex-wrap gap-6 mt-3 text-[13px] text-neutral-500">
          <span>{worst.label}: {(worst.denialRate * 100).toFixed(1)}%</span>
          <span>White: {(worst.baselineDenialRate * 100).toFixed(1)}%</span>
          <span>{worst.applications.toLocaleString()} applications</span>
          {worst.chiSquare && (
            <span>
              χ² p={worst.chiSquare.pValue < 0.001 ? "<0.001" : worst.chiSquare.pValue.toFixed(3)}
            </span>
          )}
          {worst.ci && (
            <span>95% CI [{worst.ci.lower.toFixed(2)}x–{worst.ci.upper.toFixed(2)}x]</span>
          )}
        </div>

        {/* CI bar for worst group */}
        {worst.ci && (
          <div className="mt-4 max-w-xs">
            <p className="text-[10px] text-neutral-400 mb-1">95% Confidence interval (red = excludes 1.0x)</p>
            <CIBar lower={worst.ci.lower} upper={worst.ci.upper} ratio={worst.ratio} />
            <div className="flex justify-between text-[9px] text-neutral-400 mt-0.5">
              <span>0.5x</span><span>1.0x</span><span>4.0x</span>
            </div>
          </div>
        )}

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

      {/* All ratios table */}
      {ratios.length > 1 && (
        <div>
          <p className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-4">
            All Disparity Ratios
          </p>
          <div className="divide-y divide-neutral-200">
            {ratios.map((r) => {
              const b = evidenceBadge(r);
              const stars = sigStars(r);
              return (
                <div key={r.group} className="py-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-[#111]">{r.label}</span>
                      {stars && <span className="text-red-700 font-bold text-sm">{stars}</span>}
                      {b && (
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${b.style}`}>
                          {b.label}
                        </span>
                      )}
                      <span className="text-[12px] text-neutral-400">
                        {r.applications.toLocaleString()} apps · {(r.denialRate * 100).toFixed(1)}% denied
                      </span>
                      {r.chiSquare && (
                        <span className="text-[11px] text-neutral-400">
                          p={r.chiSquare.pValue < 0.001 ? "<0.001" : r.chiSquare.pValue.toFixed(3)}
                        </span>
                      )}
                    </div>
                    <span className={`text-lg font-bold tabular-nums ml-4 ${ratioColor(r.ratio)}`}>
                      {r.ratio.toFixed(2)}x
                    </span>
                  </div>
                  {r.ci && (
                    <div className="max-w-xs ml-0">
                      <CIBar lower={r.ci.lower} upper={r.ci.upper} ratio={r.ratio} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-neutral-400 mt-3">
            ★★ p&lt;0.01 · ★ p&lt;0.05 (Yates-corrected chi-square) · CI bars: red = excludes 1.0x (statistically significant)
          </p>
        </div>
      )}
    </div>
  );
}
