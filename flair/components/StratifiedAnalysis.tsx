"use client";

import { useEffect, useState } from "react";
import { DisparityRatio } from "@/lib/computations";
import { CMHResult, PowerAnalysis, formatPValue } from "@/lib/statistics";

// ── Types returned by /api/stratified ────────────────────────────────────────

interface StratumResult {
  label: string;
  denialRates: { group: string; label: string; applications: number; denials: number; originations: number; denialRate: number }[];
  disparityRatios: DisparityRatio[];
  totalApplications: number;
}

interface CMHEntry {
  group: string;
  label: string;
  cmh: CMHResult;
}

interface PowerEntry {
  group: string;
  label: string;
  applications: number;
  mde: PowerAnalysis | null;
}

interface StratifiedData {
  overall: DisparityRatio[];
  conventionalPurchase: StratumResult | null;
  loanTypeStrata: (StratumResult & { loanType: string })[];
  incomeBandStrata: StratumResult[];
  incomeBandsAvailable: boolean;
  loanTypeCMH: CMHEntry[];
  incomeBandCMH: CMHEntry[] | null;
  powerAnalysis: PowerEntry[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pValueBadge(p: number) {
  const text = formatPValue(p);
  if (p < 0.01) return <span className="text-[10px] font-bold text-red-700">p={text}</span>;
  if (p < 0.05) return <span className="text-[10px] font-semibold text-orange-700">p={text}</span>;
  return <span className="text-[10px] text-neutral-400">p={text}</span>;
}

function ciBadge(ci: { lower: number; upper: number } | null | undefined) {
  if (!ci) return null;
  return (
    <span className="text-[10px] text-neutral-500">
      95% CI [{ci.lower.toFixed(2)}x–{ci.upper.toFixed(2)}x]
    </span>
  );
}

function ratioColor(ratio: number): string {
  if (ratio >= 2.0) return "text-red-700";
  if (ratio >= 1.5) return "text-[#111]";
  if (ratio >= 1.2) return "text-neutral-600";
  return "text-neutral-400";
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-1">
      {children}
    </p>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  lei: string;
  state?: string;
  msa?: string;
  years: string;
  lenderName: string;
  geoLabel: string;
  yearLabel: string;
}

export default function StratifiedAnalysis({
  lei,
  state,
  msa,
  years,
  lenderName,
  geoLabel,
  yearLabel,
}: Props) {
  const [data, setData] = useState<StratifiedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const geoParam = msa ? `msa=${msa}` : `state=${state}`;
    fetch(`/api/stratified?lei=${lei}&${geoParam}&years=${years}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [lei, state, msa, years]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-400 py-8">
        <div className="w-4 h-4 border-2 border-neutral-300 border-t-[#111] rounded-full animate-spin" />
        Computing controlled disparity statistics…
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="text-sm text-red-600 py-4">
        Error loading controlled analysis: {error ?? "No data"}
      </p>
    );
  }

  const { overall, conventionalPurchase, loanTypeStrata, incomeBandStrata, incomeBandsAvailable, loanTypeCMH, incomeBandCMH, powerAnalysis } = data;

  return (
    <div className="space-y-10">
      {/* ── Overall with CI and p-values ──────────────────────────────────── */}
      <div>
        <SectionLabel>Overall Disparity Ratios — With Statistical Significance</SectionLabel>
        <p className="text-[13px] text-neutral-400 mb-4">
          {lenderName} in {geoLabel} ({yearLabel}). 95% confidence intervals via log-ratio delta method;
          Yates-corrected chi-square p-values.
        </p>
        {overall.length === 0 ? (
          <p className="text-sm text-neutral-400">
            Insufficient data — fewer than 30 applications for all non-White groups.
          </p>
        ) : (
          <div className="divide-y divide-neutral-200">
            {overall.map((r) => (
              <div key={r.group} className="py-3 flex items-start justify-between gap-4">
                <div>
                  <span className="text-sm font-medium text-[#111]">{r.label}</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {ciBadge(r.ci)}
                    {r.chiSquare && pValueBadge(r.chiSquare.pValue)}
                    {r.chiSquare?.smallCellWarning && (
                      <span className="text-[10px] text-orange-600">⚠ small cells</span>
                    )}
                  </div>
                  <p className="text-[12px] text-neutral-400 mt-0.5">
                    {r.applications.toLocaleString()} apps ·{" "}
                    {(r.denialRate * 100).toFixed(1)}% denied vs.{" "}
                    {(r.baselineDenialRate * 100).toFixed(1)}% White
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-xl font-bold tabular-nums ${ratioColor(r.ratio)}`}>
                    {r.ratio.toFixed(2)}x
                  </span>
                  {r.chiSquare?.significant && (
                    <p className="text-[10px] text-red-700 font-medium mt-0.5">Statistically significant</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-neutral-400 mt-3">
          Chi-square tests: H₀ = denial rate is independent of race.
          A statistically significant result (p&lt;0.05) means the disparity is unlikely due to chance.
        </p>
      </div>

      {/* ── Conventional Purchase Loans (strongest legal stratum) ─────────── */}
      <div>
        <SectionLabel>Conventional Purchase Loans Only — Strongest Legal Stratum</SectionLabel>
        <p className="text-[13px] text-neutral-400 mb-4">
          Filtering to conventional (non-government-backed) purchase loans removes the
          largest confounder (FHA/VA usage) and isolates the lender&apos;s underwriting
          discretion. Disparity in this stratum is the hardest to explain by business
          justification.
        </p>
        {!conventionalPurchase || conventionalPurchase.disparityRatios.length === 0 ? (
          <p className="text-sm text-neutral-400">
            Insufficient data for conventional purchase loans (fewer than 30 applications per group).
          </p>
        ) : (
          <div className="divide-y divide-neutral-200">
            {conventionalPurchase.disparityRatios.map((r) => (
              <div key={r.group} className="py-3 flex items-start justify-between gap-4">
                <div>
                  <span className="text-sm font-medium text-[#111]">{r.label}</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {ciBadge(r.ci)}
                    {r.chiSquare && pValueBadge(r.chiSquare.pValue)}
                  </div>
                  <p className="text-[12px] text-neutral-400 mt-0.5">
                    {r.applications.toLocaleString()} apps ·{" "}
                    {(r.denialRate * 100).toFixed(1)}% denied
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-xl font-bold tabular-nums ${ratioColor(r.ratio)}`}>
                    {r.ratio.toFixed(2)}x
                  </span>
                  {r.chiSquare?.significant && (
                    <p className="text-[10px] text-red-700 font-medium mt-0.5">Significant</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Loan Type Stratification ─────────────────────────────────────── */}
      {loanTypeStrata.length > 0 && (
        <div>
          <SectionLabel>Disparity by Loan Type — Controlling for Government Guarantees</SectionLabel>
          <p className="text-[13px] text-neutral-400 mb-4">
            FHA, VA, and USDA loans have government backing and different underwriting
            requirements. Disparities that persist within each loan type cannot be
            explained by the FHA/conventional mix.
          </p>
          {loanTypeStrata.map((stratum) => (
            <div key={stratum.label} className="mb-6">
              <p className="text-xs font-semibold text-[#111] mb-2">
                {stratum.label} ({stratum.totalApplications.toLocaleString()} total apps)
              </p>
              {stratum.disparityRatios.length === 0 ? (
                <p className="text-xs text-neutral-400 pl-3">
                  Insufficient data (&lt;30 applications per group in this stratum).
                </p>
              ) : (
                <div className="pl-3 divide-y divide-neutral-100">
                  {stratum.disparityRatios.map((r) => (
                    <div key={r.group} className="py-2 flex items-center justify-between gap-4">
                      <div>
                        <span className="text-sm text-[#111]">{r.label}</span>
                        <div className="flex flex-wrap gap-2 mt-0.5">
                          {ciBadge(r.ci)}
                          {r.chiSquare && pValueBadge(r.chiSquare.pValue)}
                        </div>
                      </div>
                      <span className={`text-base font-bold tabular-nums ${ratioColor(r.ratio)}`}>
                        {r.ratio.toFixed(2)}x
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* CMH across loan type strata */}
          {loanTypeCMH.length > 0 && (
            <div className="mt-4 border-t border-neutral-200 pt-4">
              <p className="text-xs font-semibold text-[#111] mb-2">
                Cochran-Mantel-Haenszel Test — Controlling for Loan Type
              </p>
              <p className="text-[12px] text-neutral-500 mb-3">
                CMH tests whether the racial disparity is non-zero after conditioning on
                loan type. A significant result cannot be explained by loan-type composition.
              </p>
              <div className="divide-y divide-neutral-100">
                {loanTypeCMH.map(({ group, label, cmh }) => (
                  <div key={group} className="py-2 flex items-center justify-between">
                    <span className="text-sm text-[#111]">{label}</span>
                    <div className="text-right">
                      <span className="text-sm font-medium text-[#111]">
                        χ²={cmh.statistic.toFixed(2)}
                      </span>
                      <span className="text-sm text-neutral-400 mx-2">·</span>
                      {pValueBadge(cmh.pValue)}
                      {cmh.commonOddsRatio !== null && (
                        <span className="text-[10px] text-neutral-400 ml-2">
                          MH OR={cmh.commonOddsRatio.toFixed(2)}
                        </span>
                      )}
                      {cmh.strataExcluded > 0 && (
                        <span className="text-[10px] text-neutral-400 ml-2">
                          ({cmh.strataExcluded} strata excluded — insufficient data)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-neutral-400 mt-2">
                Strata with expected cell count &lt;5 are excluded from CMH pool per
                Cochran (1954). CMH follows χ²(1) under H₀.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Income Band Stratification ───────────────────────────────────── */}
      {incomeBandsAvailable && incomeBandStrata.length > 0 ? (
        <div>
          <SectionLabel>Disparity by Income Band — Controlling for Applicant Income</SectionLabel>
          <p className="text-[13px] text-neutral-400 mb-4">
            Comparing denial rates within applicants of the same income bracket controls
            for the most visible creditworthiness proxy available in public HMDA data.
            Disparities that persist within an income band cannot be attributed to
            income differences.
          </p>
          {incomeBandStrata.map((stratum) => (
            <div key={stratum.label} className="mb-4">
              <p className="text-xs font-semibold text-[#111] mb-2">
                {stratum.label} ({stratum.totalApplications.toLocaleString()} total apps)
              </p>
              {stratum.disparityRatios.length === 0 ? (
                <p className="text-xs text-neutral-400 pl-3">
                  Insufficient data in this income band.
                </p>
              ) : (
                <div className="pl-3 divide-y divide-neutral-100">
                  {stratum.disparityRatios.map((r) => (
                    <div key={r.group} className="py-2 flex items-center justify-between gap-4">
                      <div>
                        <span className="text-sm text-[#111]">{r.label}</span>
                        <div className="flex flex-wrap gap-2 mt-0.5">
                          {ciBadge(r.ci)}
                          {r.chiSquare && pValueBadge(r.chiSquare.pValue)}
                        </div>
                      </div>
                      <span className={`text-base font-bold tabular-nums ${ratioColor(r.ratio)}`}>
                        {r.ratio.toFixed(2)}x
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* CMH across income bands */}
          {incomeBandCMH && incomeBandCMH.length > 0 && (
            <div className="mt-4 border-t border-neutral-200 pt-4">
              <p className="text-xs font-semibold text-[#111] mb-2">
                CMH Test — Controlling for Income Band
              </p>
              <div className="divide-y divide-neutral-100">
                {incomeBandCMH.map(({ group, label, cmh }) => (
                  <div key={group} className="py-2 flex items-center justify-between">
                    <span className="text-sm text-[#111]">{label}</span>
                    <div className="text-right">
                      <span className="text-sm font-medium text-[#111]">
                        χ²={cmh.statistic.toFixed(2)}
                      </span>
                      <span className="text-sm text-neutral-400 mx-2">·</span>
                      {pValueBadge(cmh.pValue)}
                      {cmh.strataExcluded > 0 && (
                        <span className="text-[10px] text-neutral-400 ml-2">
                          ({cmh.strataExcluded} strata excluded)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <SectionLabel>Income Band Stratification</SectionLabel>
          <p className="text-[13px] text-neutral-500">
            Income band analysis{" "}
            {incomeBandsAvailable
              ? "returned insufficient data for this lender and geography."
              : "is not supported by the HMDA aggregation API for this query. Income-band analysis requires requesting raw HMDA loan-level data (CSV download from ffiec.cfpb.gov), which is available pre-litigation."}
          </p>
        </div>
      )}

      {/* ── Power Analysis / Minimum Detectable Effect ───────────────────── */}
      <div>
        <SectionLabel>Sample Size & Statistical Power</SectionLabel>
        <p className="text-[13px] text-neutral-400 mb-4">
          Minimum detectable ratio (MDR) at 80% power and 95% confidence (two-sided).
          If the MDR is above 1.5x, the sample is too small to reliably detect a
          moderate disparity even if one exists — absence of detected disparity does{" "}
          <strong>not</strong> mean absence of discrimination.
        </p>
        {powerAnalysis.length === 0 ? (
          <p className="text-sm text-neutral-400">No power data available.</p>
        ) : (
          <div className="divide-y divide-neutral-200">
            {powerAnalysis.map((entry) => {
              const mde = entry.mde;
              const mdr =
                mde && isFinite(mde.minimumDetectableRatio)
                  ? mde.minimumDetectableRatio
                  : null;
              const adequate = mde?.adequateFor1_5 ?? false;
              return (
                <div key={entry.group} className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <span className="text-sm font-medium text-[#111]">{entry.label}</span>
                    <p className="text-[12px] text-neutral-400 mt-0.5">
                      {entry.applications.toLocaleString()} applications
                    </p>
                  </div>
                  <div className="text-right">
                    {mdr !== null ? (
                      <>
                        <span
                          className={`text-base font-bold tabular-nums ${adequate ? "text-neutral-500" : "text-orange-700"}`}
                        >
                          MDR {mdr.toFixed(2)}x
                        </span>
                        <p
                          className={`text-[10px] mt-0.5 ${adequate ? "text-neutral-400" : "text-orange-700"}`}
                        >
                          {adequate
                            ? "Adequate power to detect ≥1.5x"
                            : "⚠ Underpowered — cannot reliably detect ≥1.5x"}
                        </p>
                      </>
                    ) : (
                      <span className="text-[12px] text-neutral-400">Insufficient data</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-4 p-3 bg-neutral-50 border border-neutral-200 rounded">
          <p className="text-[12px] text-neutral-600 leading-relaxed">
            <strong>Legal note:</strong> Underpowered studies produce non-significant results
            for reasons unrelated to discrimination. Courts distinguish{" "}
            <em>&ldquo;disparity not detected&rdquo;</em> (finding) from{" "}
            <em>&ldquo;sample too small to detect disparity&rdquo;</em> (limitation).
            Pooling multiple years increases power — the Peers &amp; Trends tab shows
            multi-year data. Credit score, exact DTI, and LTV are{" "}
            <strong>not</strong> in public HMDA data; they remain for discovery.
          </p>
        </div>
      </div>
    </div>
  );
}
