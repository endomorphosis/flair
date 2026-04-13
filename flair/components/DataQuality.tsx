"use client";

import { useEffect, useState } from "react";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Ratio of minority attrition rate to White attrition rate above which we flag the group */
const MIN_ATTRITION_THRESHOLD_RATIO = 1.2;

// ── Types returned by /api/quality ────────────────────────────────────────────

interface RaceLoanTypeSplit {
  race: string;
  label: string;
  totalApplications: number;
  byLoanType: { loanType: string; loanTypeLabel: string; pct: number; count: number }[];
}

interface FhaImbalanceFlag {
  race: string;
  label: string;
  fhaPct: number;
  whiteFhaPct: number;
  diffPp: number;
}

interface LoanTypeMix {
  byRace: RaceLoanTypeSplit[];
  fhaImbalanceFlags: FhaImbalanceFlag[];
  hasSignificantMixImbalance: boolean;
}

interface WithdrawalStats {
  race: string;
  label: string;
  originated: number;
  denied: number;
  withdrawn: number;
  incomplete: number;
  totalSubmitted: number;
  attritionRate: number;
}

interface OccupancySplit {
  race: string;
  label: string;
  principalPct: number;
  secondPct: number;
  investmentPct: number;
  totalApplications: number;
}

interface QualityData {
  loanTypeMix: LoanTypeMix | null;
  withdrawalStats: WithdrawalStats[] | null;
  occupancyMix: OccupancySplit[] | null;
}

// ── Helper ────────────────────────────────────────────────────────────────────

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

export default function DataQuality({
  lei,
  state,
  msa,
  years,
  lenderName,
  geoLabel,
  yearLabel,
}: Props) {
  const [data, setData] = useState<QualityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const geoParam = msa ? `msa=${msa}` : `state=${state}`;
    fetch(`/api/quality?lei=${lei}&${geoParam}&years=${years}`)
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
        Loading data quality metrics…
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="text-sm text-red-600 py-4">
        Error loading data quality: {error ?? "No data"}
      </p>
    );
  }

  const { loanTypeMix, withdrawalStats, occupancyMix } = data;

  return (
    <div className="space-y-10">
      <div>
        <SectionLabel>Data Quality &amp; Confounding Disclosure</SectionLabel>
        <p className="text-[13px] text-neutral-500 mb-2">
          {lenderName} in {geoLabel} ({yearLabel}).
          These metrics disclose the primary observable confounders in public HMDA data.
          They are required disclosures for any fair lending legal filing.
        </p>
      </div>

      {/* ── Loan type mix by race ──────────────────────────────────────────── */}
      <div>
        <SectionLabel>Loan Type Distribution by Race</SectionLabel>
        <p className="text-[13px] text-neutral-400 mb-4">
          FHA loans carry a government guarantee and have lower credit-score thresholds
          than conventional loans. If racial groups use FHA at different rates, the
          raw denial-rate comparison partially measures loan-type composition rather
          than lender conduct. A ≥20 percentage-point difference is flagged.
        </p>

        {!loanTypeMix ? (
          <p className="text-sm text-neutral-400">Loan type data not available.</p>
        ) : (
          <>
            {loanTypeMix.hasSignificantMixImbalance && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded text-[13px] text-orange-900">
                <strong>⚠ Loan type mix imbalance detected.</strong>{" "}
                {loanTypeMix.fhaImbalanceFlags.map((f) => (
                  <span key={f.race}>
                    {f.label} applicants use FHA at {f.fhaPct.toFixed(0)}% vs.{" "}
                    {f.whiteFhaPct.toFixed(0)}% for White applicants (
                    {f.diffPp > 0 ? "+" : ""}
                    {f.diffPp.toFixed(0)}pp).{" "}
                  </span>
                ))}
                Stratified analysis controlling for loan type is shown in the Controls tab.
              </div>
            )}

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-2 pr-4 text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
                    Group
                  </th>
                  <th className="text-right py-2 px-3 text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
                    Conventional
                  </th>
                  <th className="text-right py-2 px-3 text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
                    FHA
                  </th>
                  <th className="text-right py-2 px-3 text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
                    VA
                  </th>
                  <th className="text-right py-2 pl-3 text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
                    USDA
                  </th>
                </tr>
              </thead>
              <tbody>
                {loanTypeMix.byRace.map((row) => {
                  function pct(code: string) {
                    return row.byLoanType.find((lt) => lt.loanType === code)?.pct ?? 0;
                  }
                  return (
                    <tr key={row.race} className="border-b border-neutral-100">
                      <td className="py-3 pr-4 text-sm text-[#111]">
                        {row.label}
                        <span className="text-neutral-400 text-[11px] ml-1">
                          ({row.totalApplications.toLocaleString()})
                        </span>
                      </td>
                      {["1", "2", "3", "4"].map((code) => {
                        const p = pct(code);
                        const isFha = code === "2";
                        const flag = isFha && loanTypeMix.fhaImbalanceFlags.find((f) => f.race === row.race);
                        return (
                          <td
                            key={code}
                            className={`py-3 px-3 text-right tabular-nums text-[13px] ${flag ? "text-orange-700 font-semibold" : "text-neutral-600"}`}
                          >
                            {p.toFixed(0)}%
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* ── Withdrawal / attrition rate by race ───────────────────────────── */}
      <div>
        <SectionLabel>Application Attrition Rate by Race</SectionLabel>
        <p className="text-[13px] text-neutral-400 mb-4">
          Applications withdrawn by the applicant (action code 4) and files closed for
          incompleteness (action code 5) represent process friction. A higher attrition
          rate for minority groups relative to White applicants may indicate lender
          discouragement — an evidence item admissible under ECOA.
        </p>
        {!withdrawalStats || withdrawalStats.length === 0 ? (
          <p className="text-sm text-neutral-400">Attrition data not available.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="text-left py-2 pr-4 text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
                  Group
                </th>
                <th className="text-right py-2 px-3 text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
                  Originated
                </th>
                <th className="text-right py-2 px-3 text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
                  Denied
                </th>
                <th className="text-right py-2 px-3 text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
                  Withdrawn
                </th>
                <th className="text-right py-2 px-3 text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
                  Incomplete
                </th>
                <th className="text-right py-2 pl-3 text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
                  Attrition %
                </th>
              </tr>
            </thead>
            <tbody>
              {withdrawalStats.map((row) => {
                const whiteAttrition = withdrawalStats.find((r) => r.race === "White")?.attritionRate ?? 0;
                const isHigh = row.race !== "White" && row.attritionRate > whiteAttrition * MIN_ATTRITION_THRESHOLD_RATIO;
                return (
                  <tr key={row.race} className="border-b border-neutral-100">
                    <td className="py-3 pr-4 text-sm text-[#111]">{row.label}</td>
                    <td className="py-3 px-3 text-right tabular-nums text-[13px] text-neutral-600">
                      {row.originated.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-[13px] text-neutral-600">
                      {row.denied.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-[13px] text-neutral-600">
                      {row.withdrawn.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-[13px] text-neutral-600">
                      {row.incomplete.toLocaleString()}
                    </td>
                    <td
                      className={`py-3 pl-3 text-right tabular-nums text-[13px] font-medium ${isHigh ? "text-orange-700" : "text-neutral-600"}`}
                    >
                      {(row.attritionRate * 100).toFixed(1)}%
                      {isHigh && " ⚠"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <p className="text-[11px] text-neutral-400 mt-2">
          Attrition rate = (withdrawn + incomplete) ÷ all submitted applications.
          Flagged (⚠) when a group&apos;s rate exceeds the White rate by ≥20%.
        </p>
      </div>

      {/* ── Occupancy type mix by race ─────────────────────────────────────── */}
      <div>
        <SectionLabel>Occupancy Type Distribution by Race</SectionLabel>
        <p className="text-[13px] text-neutral-400 mb-4">
          Investment property loans (third-home or rental purchases) carry higher risk
          premiums and face higher denial rates at all lenders. A higher share of
          investment applications in any racial group confounds denial-rate comparisons.
        </p>
        {!occupancyMix || occupancyMix.length === 0 ? (
          <p className="text-sm text-neutral-400">Occupancy type data not available.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="text-left py-2 pr-4 text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
                  Group
                </th>
                <th className="text-right py-2 px-3 text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
                  Principal Residence
                </th>
                <th className="text-right py-2 px-3 text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
                  Second Home
                </th>
                <th className="text-right py-2 pl-3 text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
                  Investment
                </th>
              </tr>
            </thead>
            <tbody>
              {occupancyMix.map((row) => (
                <tr key={row.race} className="border-b border-neutral-100">
                  <td className="py-3 pr-4 text-sm text-[#111]">
                    {row.label}
                    <span className="text-neutral-400 text-[11px] ml-1">
                      ({row.totalApplications.toLocaleString()})
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-[13px] text-neutral-600">
                    {row.principalPct.toFixed(0)}%
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-[13px] text-neutral-600">
                    {row.secondPct.toFixed(0)}%
                  </td>
                  <td className="py-3 pl-3 text-right tabular-nums text-[13px] text-neutral-600">
                    {row.investmentPct.toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Summary note ──────────────────────────────────────────────────── */}
      <div className="p-4 border border-neutral-200 rounded bg-neutral-50">
        <p className="text-[12px] text-neutral-600 leading-relaxed">
          <strong>Observable confounders in public HMDA data</strong> (loan type, income
          band, occupancy type) are controlled for in the Controls tab.{" "}
          <strong>
            Unobservable confounders (credit score, exact DTI, LTV, appraisal value)
          </strong>{" "}
          are not in public HMDA data and require litigation discovery (FRCP Rules
          26/34) or government subpoena (Civil Investigative Demand). Courts have
          consistently held that HMDA-based analysis is admissible at the pleading stage
          even without controlling for these variables — they are obtained post-filing.
          The 1994 Interagency Policy Statement on Discrimination in Lending expressly
          recognizes statistical evidence of disparate impact as a legitimate evidentiary
          method prior to creditworthiness controls.
        </p>
      </div>
    </div>
  );
}
