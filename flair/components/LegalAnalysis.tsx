"use client";

import { useEffect, useState } from "react";
import { DisparityRatio } from "@/lib/computations";
import {
  ENFORCEMENT_CASES,
  EnforcementCase,
  getCasesByLegalTheory,
  getEnforcementSummary,
} from "@/lib/enforcement-cases";

interface TrendYear {
  year: number;
  disparityRatios: DisparityRatio[];
}

interface EvidenceItem {
  label: string;
  status: "supported" | "not_supported" | "requires_discovery";
  detail: string;
  legalElement: string;
}

interface CauseOfAction {
  name: string;
  statute: string;
  description: string;
  evidenceSupport: "strong" | "partial" | "insufficient";
  elements: { label: string; met: boolean }[];
  matchingCases: EnforcementCase[];
}

interface Props {
  disparityRatios: DisparityRatio[];
  marketRatios: DisparityRatio[];
  trends: TrendYear[];
  lenderName: string;
  geoLabel: string;
  state: string;
  lei: string;
  year: number;
}

function buildEvidenceItems(
  disparityRatios: DisparityRatio[],
  marketRatios: DisparityRatio[],
  trends: TrendYear[],
  geoGap: number | null
): EvidenceItem[] {
  const worst = disparityRatios[0];
  const hasDisparity = worst && worst.ratio >= 1.5;

  const isOutlier = disparityRatios.some((lr) => {
    const mr = marketRatios.find((m) => m.group === lr.group);
    return mr && lr.ratio - mr.ratio > 0.1;
  });

  const persistentYears = trends.filter(
    (t) => t.disparityRatios.length > 0 && t.disparityRatios[0].ratio >= 1.5
  ).length;
  const isPersistent = persistentYears >= 2;

  const hasGeoGap = geoGap !== null && geoGap < -5;

  return [
    {
      label: "Statistical disparity in denial rates",
      status: hasDisparity ? "supported" : "not_supported",
      detail: worst
        ? `Highest ratio: ${worst.ratio.toFixed(2)}x (${worst.label} vs. White)`
        : "No significant disparity detected",
      legalElement: "Prima facie disparate impact (FHA \u00a7 3605)",
    },
    {
      label: "Peer comparison shows outlier pattern",
      status: isOutlier ? "supported" : "not_supported",
      detail: isOutlier
        ? "Lender's disparity exceeds market average"
        : "Lender is within market norms",
      legalElement: "Pattern beyond market norms (rebuts business justification)",
    },
    {
      label: "Multi-year persistence",
      status: isPersistent ? "supported" : "not_supported",
      detail: `Disparity \u2265 1.5x in ${persistentYears} of ${trends.length} years analyzed`,
      legalElement: "Ongoing practice, not a one-time anomaly",
    },
    {
      label: "Geographic lending gap",
      status: hasGeoGap ? "supported" : "not_supported",
      detail:
        geoGap !== null
          ? `Lender is ${Math.abs(geoGap).toFixed(1)} pts ${geoGap < 0 ? "below" : "above"} market in majority-minority counties`
          : "Geographic data not available",
      legalElement: "Redlining pattern (FHA \u00a7 3604)",
    },
    {
      label: "Creditworthiness controls",
      status: "requires_discovery",
      detail: "Credit score, DTI, LTV not available in public HMDA data",
      legalElement: "Requires litigation discovery (FRCP Rules 26/34)",
    },
    {
      label: "Matched pairs analysis",
      status: "requires_discovery",
      detail: "Requires access to internal loan files",
      legalElement: "Post-discovery expert analysis",
    },
  ];
}

function matchDisparateImpactCases(
  worstRatio: number
): EnforcementCase[] {
  // Prefer cases with structured pricing/denial metrics ≤ the lender's ratio
  const withMetrics = ENFORCEMENT_CASES.filter(
    (c) =>
      c.structuredMetrics?.pricingDisparityRatio != null &&
      c.structuredMetrics.pricingDisparityRatio <= worstRatio
  ).sort((a, b) => b.settlementAmount - a.settlementAmount);

  // Fall back to legal theory if not enough structured matches
  const byTheory = ENFORCEMENT_CASES.filter(
    (c) =>
      !c.structuredMetrics?.pricingDisparityRatio &&
      (c.legalTheory.includes("pricing discrimination") ||
        c.legalTheory.includes("disparate impact") ||
        c.legalTheory.includes("steering"))
  ).sort((a, b) => b.settlementAmount - a.settlementAmount);

  return [...withMetrics, ...byTheory].slice(0, 5);
}

function matchRedliningCases(
  lenderMmPct: number,
  marketMmPct: number
): EnforcementCase[] {
  const lenderGapPts = marketMmPct - lenderMmPct; // positive = lender below market

  // Prefer cases with structured geographic metrics
  const withMetrics = getCasesByLegalTheory("redlining")
    .filter((c) => c.structuredMetrics != null)
    .sort((a, b) => {
      // Sort by how comparable the metrics are
      const aRatio = a.structuredMetrics?.peerApplicationRatio || 0;
      const bRatio = b.structuredMetrics?.peerApplicationRatio || 0;
      // Higher peer ratios = worse redlining, sort descending by settlement
      return b.settlementAmount - a.settlementAmount;
    });

  const withoutMetrics = getCasesByLegalTheory("redlining")
    .filter((c) => !c.structuredMetrics)
    .sort((a, b) => b.settlementAmount - a.settlementAmount);

  return [...withMetrics, ...withoutMetrics].slice(0, 5);
}

function buildCausesOfAction(
  evidence: EvidenceItem[],
  worstRatio: number,
  lenderMmPct: number | null,
  marketMmPct: number | null
): CauseOfAction[] {
  const hasDisparity = evidence[0].status === "supported";
  const isOutlier = evidence[1].status === "supported";
  const isPersistent = evidence[2].status === "supported";
  const hasGeoGap = evidence[3].status === "supported";

  const causes: CauseOfAction[] = [];

  if (hasDisparity) {
    causes.push({
      name: "Disparate Impact",
      statute: "Fair Housing Act \u00a7 3605",
      description:
        "Statistical evidence of racial disparities in lending outcomes can establish prima facie liability without proof of discriminatory intent.",
      evidenceSupport: isOutlier || isPersistent ? "strong" : "partial",
      elements: [
        { label: "Statistical disparity established", met: true },
        { label: "Disparity exceeds peer norms", met: isOutlier },
        { label: "Pattern is persistent over time", met: isPersistent },
        { label: "Creditworthiness controls (requires discovery)", met: false },
      ],
      matchingCases: matchDisparateImpactCases(worstRatio),
    });
  }

  if (hasDisparity || isOutlier) {
    causes.push({
      name: "ECOA Discrimination",
      statute: "15 U.S.C. \u00a7 1691",
      description:
        "Prohibits discrimination in credit transactions on the basis of race, color, national origin, sex, marital status, or age.",
      evidenceSupport: hasDisparity && isOutlier ? "strong" : "partial",
      elements: [
        { label: "Disparity in credit decisions", met: hasDisparity },
        { label: "Pattern beyond market norms", met: isOutlier },
        { label: "Multi-year persistence", met: isPersistent },
        { label: "Creditworthiness controls (requires discovery)", met: false },
      ],
      matchingCases: matchDisparateImpactCases(worstRatio),
    });
  }

  if (hasGeoGap && lenderMmPct != null && marketMmPct != null) {
    causes.push({
      name: "Redlining",
      statute: "Fair Housing Act \u00a7 3604",
      description:
        "Geographic pattern of avoiding majority-minority communities in lending activity.",
      evidenceSupport: hasGeoGap && hasDisparity ? "strong" : "partial",
      elements: [
        { label: "Geographic lending gap vs. peers", met: true },
        { label: "Denial rate disparities", met: hasDisparity },
        { label: "CRA assessment area analysis (requires discovery)", met: false },
      ],
      matchingCases: matchRedliningCases(lenderMmPct, marketMmPct),
    });
  }

  return causes;
}

function formatDollars(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(0)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

export default function LegalAnalysis({
  disparityRatios,
  marketRatios,
  trends,
  lenderName,
  geoLabel,
  state,
  lei,
  year,
}: Props) {
  const [geoGap, setGeoGap] = useState<number | null>(null);
  const [lenderMmPct, setLenderMmPct] = useState<number | null>(null);
  const [marketMmPct, setMarketMmPct] = useState<number | null>(null);
  const [expandedCase, setExpandedCase] = useState<string | null>(null);

  useEffect(() => {
    if (!state) return;
    fetch(`/api/geographic?lei=${lei}&state=${state}&year=${year}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) {
          setGeoGap(d.gap);
          setLenderMmPct(d.lender?.mmPct ?? null);
          setMarketMmPct(d.market?.mmPct ?? null);
        }
      })
      .catch(() => {});
  }, [lei, state, year]);

  const evidence = buildEvidenceItems(disparityRatios, marketRatios, trends, geoGap);
  const worstRatio = disparityRatios.length > 0 ? disparityRatios[0].ratio : 0;
  const causesOfAction = buildCausesOfAction(evidence, worstRatio, lenderMmPct, marketMmPct);
  const summary = getEnforcementSummary();
  const supportedCount = evidence.filter((e) => e.status === "supported").length;

  return (
    <div className="space-y-6">
      {/* Section 1: Evidence Assessment */}
      <div className="py-2">
        <h3 className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-1">
          Evidence Assessment
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          What FLAIR&apos;s analysis establishes for {lenderName} in {geoLabel} ({year})
        </p>

        <div className="space-y-3">
          {evidence.map((item) => (
            <div
              key={item.label}
              className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0"
            >
              <span className="mt-0.5 text-base">
                {item.status === "supported"
                  ? "\u2705"
                  : item.status === "requires_discovery"
                  ? "\u26A0\uFE0F"
                  : "\u274C"}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">
                  {item.label}
                </p>
                <p className="text-xs text-slate-500">{item.detail}</p>
              </div>
              <span className="text-xs text-slate-400 text-right max-w-48">
                {item.legalElement}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            {supportedCount} of 4 screening elements supported by available data.
            {supportedCount >= 2
              ? " This level of evidence typically warrants further investigation."
              : " Additional evidence may be needed to support a claim."}
          </p>
        </div>
      </div>

      {/* Section 2: Causes of Action with Enforcement Benchmark */}
      {causesOfAction.length > 0 && (
        <div className="py-2">
          <h3 className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-1">
            Available Causes of Action
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Legal theories supported by screening data, with enforcement precedent
          </p>

          <div className="space-y-6">
            {causesOfAction.map((coa) => (
              <div key={coa.name}>
                <div
                  className={`rounded-lg border p-4 ${
                    coa.evidenceSupport === "strong"
                      ? "border-blue-200 bg-blue-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-slate-900">{coa.name}</h4>
                    <span className="text-xs text-slate-500">({coa.statute})</span>
                    <span
                      className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${
                        coa.evidenceSupport === "strong"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {coa.evidenceSupport === "strong" ? "Strong support" : "Partial support"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mb-3">{coa.description}</p>
                  <div className="grid grid-cols-2 gap-1">
                    {coa.elements.map((el) => (
                      <span
                        key={el.label}
                        className={`text-xs flex items-center gap-1.5 ${
                          el.met ? "text-slate-700" : "text-slate-400"
                        }`}
                      >
                        {el.met ? "\u2713" : "\u2717"} {el.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Enforcement precedent for this cause of action */}
                {coa.matchingCases.length > 0 && (
                  <div className="mt-2 ml-4 border-l-2 border-slate-200 pl-4">
                    <p className="text-xs font-semibold text-slate-600 mb-2">
                      Enforcement precedent for {coa.name.toLowerCase()}:
                    </p>
                    <div className="space-y-1.5">
                      {coa.matchingCases.map((c) => (
                        <div key={c.id}>
                          <button
                            onClick={() =>
                              setExpandedCase(expandedCase === c.id ? null : c.id)
                            }
                            className="w-full text-left flex items-center gap-2 text-xs hover:bg-slate-50 rounded px-1 py-0.5 -mx-1 transition-colors"
                          >
                            <span className="font-bold text-slate-800 whitespace-nowrap">
                              {formatDollars(c.settlementAmount)}
                            </span>
                            <span className="text-slate-700">
                              <em>{c.caseName}</em>{" "}
                              <span className="text-slate-400">({c.year})</span>
                            </span>
                            <span className="ml-auto text-slate-400">
                              {expandedCase === c.id ? "\u25B2" : "\u25BC"}
                            </span>
                          </button>
                          {expandedCase === c.id && (
                            <div className="text-xs text-slate-600 mt-1 mb-2 pl-1 space-y-1">
                              <p>{c.description}</p>
                              {c.structuredMetrics && (
                                <div className="bg-slate-100 rounded px-2 py-1.5 text-xs">
                                  {c.structuredMetrics.pricingDisparityRatio != null && (
                                    <p>
                                      <span className="font-semibold">Enforcement threshold:</span>{" "}
                                      {c.structuredMetrics.pricingDisparityRatio}x pricing disparity
                                      {worstRatio >= c.structuredMetrics.pricingDisparityRatio
                                        ? " — your lender's ratio meets or exceeds this"
                                        : ""}
                                    </p>
                                  )}
                                  {c.structuredMetrics.peerApplicationRatio != null && (
                                    <p>
                                      <span className="font-semibold">Enforcement threshold:</span>{" "}
                                      peers had {c.structuredMetrics.peerApplicationRatio}x more applications in minority areas
                                    </p>
                                  )}
                                  {c.structuredMetrics.minorityLoanSharePct != null && (
                                    <p>
                                      <span className="font-semibold">Enforcement threshold:</span>{" "}
                                      only {c.structuredMetrics.minorityLoanSharePct}% of loans in minority areas
                                      {c.structuredMetrics.peerMinorityLoanSharePct != null &&
                                        ` vs. ${c.structuredMetrics.peerMinorityLoanSharePct}% for peers`}
                                    </p>
                                  )}
                                </div>
                              )}
                              <p>
                                <span className="font-semibold">Key metric:</span>{" "}
                                {c.disparityMetric}
                              </p>
                              <p>
                                <span className="font-semibold">Geography:</span>{" "}
                                {c.geography} |{" "}
                                <span className="font-semibold">Groups affected:</span>{" "}
                                {c.racialGroupAffected.join(", ")}
                              </p>
                              {c.sourceUrl && (
                                <a
                                  href={c.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline inline-block"
                                >
                                  View source
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Enforcement Landscape */}
      <div className="py-2">
        <h3 className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-1">
          Enforcement Landscape
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Federal and state fair lending enforcement activity ({summary.yearRange.earliest}-{summary.yearRange.latest})
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-slate-900">{summary.totalCases}</p>
            <p className="text-xs text-slate-500">enforcement actions</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-slate-900">
              {formatDollars(summary.totalSettlementDollars)}
            </p>
            <p className="text-xs text-slate-500">total settlements</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-slate-900">{summary.byTheory.redlining}</p>
            <p className="text-xs text-slate-500">redlining cases</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-slate-900">{summary.byType.doj}</p>
            <p className="text-xs text-slate-500">DOJ-led cases</p>
          </div>
        </div>
      </div>
    </div>
  );
}
