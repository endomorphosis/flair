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
  status: "supported" | "not_supported" | "requires_discovery" | "partial";
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

/** Minimal summary of controlled disparity from /api/stratified */
interface ControlledDisparitySummary {
  /** True if a statistically significant disparity (p<0.05) exists in conventional purchase loans */
  significantInConventionalPurchase: boolean;
  /** True if the CMH across loan type strata is significant (p<0.05) for any group */
  cmhLoanTypeSignificant: boolean;
  /** True if income-band data was available and CMH across income bands is significant */
  cmhIncomeBandSignificant: boolean;
  /** True if income-band data was available */
  incomeBandsAvailable: boolean;
  /** True if any group is underpowered (MDR > 1.5) */
  anyGroupUnderpowered: boolean;
}

interface Props {
  disparityRatios: DisparityRatio[];
  marketRatios: DisparityRatio[];
  trends: TrendYear[];
  lenderName: string;
  geoLabel: string;
  state: string;
  lei: string;
  years: string;
  yearLabel: string;
  /** Optional pre-computed controlled disparity summary (from Controls tab data) */
  controlledDisparity?: ControlledDisparitySummary | null;
}

function buildEvidenceItems(
  disparityRatios: DisparityRatio[],
  marketRatios: DisparityRatio[],
  trends: TrendYear[],
  geoGap: number | null,
  controlled: ControlledDisparitySummary | null | undefined
): EvidenceItem[] {
  const worst = disparityRatios[0];
  const hasDisparity = worst && worst.ratio >= 1.5;
  const hasSignificantDisparity = hasDisparity && (worst.chiSquare?.significant ?? false);

  const isOutlier = disparityRatios.some((lr) => {
    const mr = marketRatios.find((m) => m.group === lr.group);
    return mr && lr.ratio - mr.ratio > 0.1;
  });

  const persistentYears = trends.filter(
    (t) => t.disparityRatios.length > 0 && t.disparityRatios[0].ratio >= 1.5
  ).length;
  const isPersistent = persistentYears >= 2;

  const hasGeoGap = geoGap !== null && geoGap < -5;

  // Controlled disparity evidence
  const hasControlledEvidence =
    controlled != null &&
    (controlled.significantInConventionalPurchase ||
      controlled.cmhLoanTypeSignificant ||
      controlled.cmhIncomeBandSignificant);

  const controlledDetail = (() => {
    if (!controlled) return "Run Controls tab to compute";
    const parts: string[] = [];
    if (controlled.significantInConventionalPurchase)
      parts.push("significant in conventional purchase loans");
    if (controlled.cmhLoanTypeSignificant)
      parts.push("CMH significant across loan-type strata");
    if (controlled.cmhIncomeBandSignificant)
      parts.push("CMH significant across income bands");
    if (parts.length === 0) {
      if (controlled.anyGroupUnderpowered)
        return "Not detected — sample may be underpowered (see Controls tab)";
      return "No significant disparity after controlling for loan type";
    }
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1) +
      (parts.length > 1 ? "; " + parts.slice(1).join("; ") : "");
  })();

  // Creditworthiness: partial if we have loan-type + income controls
  const creditworthinessStatus: EvidenceItem["status"] =
    controlled != null && (controlled.cmhLoanTypeSignificant || controlled.incomeBandsAvailable)
      ? "partial"
      : "requires_discovery";

  const creditworthinessDetail =
    controlled != null && controlled.incomeBandsAvailable
      ? "Loan type and income band controlled (public HMDA). Credit score, exact DTI, LTV require discovery."
      : controlled != null
      ? "Loan type controlled (public HMDA). Income band, credit score, DTI, LTV require discovery."
      : "Credit score, DTI, LTV not available in public HMDA data";

  return [
    {
      label: "Statistical disparity in denial rates",
      status: hasDisparity ? "supported" : "not_supported",
      detail: worst
        ? `Highest ratio: ${worst.ratio.toFixed(2)}x (${worst.label} vs. White)` +
          (hasSignificantDisparity ? ` — p${worst.chiSquare && worst.chiSquare.pValue < 0.001 ? "<0.001" : worst.chiSquare ? "=" + worst.chiSquare.pValue.toFixed(3) : ""}` : "")
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
      label: "Disparity persists after controlling for loan type and income",
      status: controlled == null ? "requires_discovery" : hasControlledEvidence ? "supported" : "not_supported",
      detail: controlledDetail,
      legalElement: "Critical for surviving summary judgment (CMH test, Controls tab)",
    },
    {
      label: "Creditworthiness controls (available variables)",
      status: creditworthinessStatus,
      detail: creditworthinessDetail,
      legalElement: "Partial controls applied; credit score / DTI / LTV via FRCP Rules 26/34",
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
  const hasControlledEvidence = evidence[4].status === "supported";
  const hasCreditworthinessControls = evidence[5].status === "partial";

  const causes: CauseOfAction[] = [];

  if (hasDisparity) {
    function disparateImpactSupport(): "strong" | "partial" | "insufficient" {
      if ((isOutlier || isPersistent) && hasControlledEvidence) return "strong";
      return "partial";
    }
    causes.push({
      name: "Disparate Impact",
      statute: "Fair Housing Act \u00a7 3605",
      description:
        "Statistical evidence of racial disparities in lending outcomes can establish prima facie liability without proof of discriminatory intent.",
      evidenceSupport: disparateImpactSupport(),
      elements: [
        { label: "Statistical disparity established", met: true },
        { label: "Disparity exceeds peer norms", met: isOutlier },
        { label: "Pattern is persistent over time", met: isPersistent },
        { label: "Persists after controlling for loan type/income", met: hasControlledEvidence },
        { label: "Credit score / DTI / LTV controls (requires discovery)", met: hasCreditworthinessControls },
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
        { label: "Persists after controlling for loan type/income", met: hasControlledEvidence },
        { label: "Credit score / DTI / LTV controls (requires discovery)", met: hasCreditworthinessControls },
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
  years,
  yearLabel,
  controlledDisparity,
}: Props) {
  const [geoGap, setGeoGap] = useState<number | null>(null);
  const [lenderMmPct, setLenderMmPct] = useState<number | null>(null);
  const [marketMmPct, setMarketMmPct] = useState<number | null>(null);
  const [expandedCase, setExpandedCase] = useState<string | null>(null);

  useEffect(() => {
    if (!state) return;
    fetch(`/api/geographic?lei=${lei}&state=${state}&years=${years}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) {
          setGeoGap(d.gap);
          setLenderMmPct(d.lender?.mmPct ?? null);
          setMarketMmPct(d.market?.mmPct ?? null);
        }
      })
      .catch(() => {});
  }, [lei, state, years]);

  const evidence = buildEvidenceItems(disparityRatios, marketRatios, trends, geoGap, controlledDisparity);
  const worstRatio = disparityRatios.length > 0 ? disparityRatios[0].ratio : 0;
  const causesOfAction = buildCausesOfAction(evidence, worstRatio, lenderMmPct, marketMmPct);
  const summary = getEnforcementSummary();
  const supportedCount = evidence.filter((e) => e.status === "supported").length;
  const partialCount = evidence.filter((e) => e.status === "partial").length;
  // Count of the 5 primary screening elements (excluding the two always-discovery items)
  const screeningTotal = 5;

  return (
    <div className="space-y-6">
      {/* Section 1: Evidence Assessment */}
      <div className="py-2">
        <h3 className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-1">
          Evidence Assessment
        </h3>
        <p className="text-xs text-neutral-500 mb-4">
          What FLAIR&apos;s analysis establishes for {lenderName} in {geoLabel} ({yearLabel})
        </p>

        <div className="space-y-3">
          {evidence.map((item) => (
            <div
              key={item.label}
              className="flex items-start gap-3 py-2 border-b border-neutral-100 last:border-0"
            >
              <span className="mt-0.5 text-base">
                {item.status === "supported"
                  ? "\u2705"
                  : item.status === "partial"
                  ? "\uD83D\uDFE1"
                  : item.status === "requires_discovery"
                  ? "\u26A0\uFE0F"
                  : "\u274C"}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-[#111]">
                  {item.label}
                </p>
                <p className="text-xs text-neutral-500">{item.detail}</p>
              </div>
              <span className="text-xs text-neutral-400 text-right max-w-48">
                {item.legalElement}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-neutral-200">
          <p className="text-xs text-neutral-500">
            {supportedCount} of {screeningTotal} primary screening elements supported
            {partialCount > 0 ? `, ${partialCount} partially controlled` : ""}.
            {supportedCount >= 3
              ? " This level of evidence typically warrants further investigation."
              : supportedCount >= 2
              ? " This level of evidence may support filing with additional expert analysis."
              : " Additional evidence may be needed to support a claim."}
            {controlledDisparity == null && (
              <> Run the <strong>Controls</strong> tab to compute CMH-adjusted statistics.</>
            )}
          </p>
        </div>
      </div>

      {/* Section 2: Causes of Action with Enforcement Benchmark */}
      {causesOfAction.length > 0 && (
        <div className="py-2">
          <h3 className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-1">
            Available Causes of Action
          </h3>
          <p className="text-xs text-neutral-500 mb-4">
            Legal theories supported by screening data, with enforcement precedent
          </p>

          <div className="space-y-6">
            {causesOfAction.map((coa) => (
              <div key={coa.name}>
                <div className="border-b border-neutral-200 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-[#111]">{coa.name}</h4>
                    <span className="text-xs text-neutral-500">({coa.statute})</span>
                    <span className="ml-auto text-[11px] font-medium text-neutral-500">
                      {coa.evidenceSupport === "strong" ? "Strong support" : "Partial support"}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 mb-3">{coa.description}</p>
                  <div className="grid grid-cols-2 gap-1">
                    {coa.elements.map((el) => (
                      <span
                        key={el.label}
                        className={`text-xs flex items-center gap-1.5 ${
                          el.met ? "text-neutral-700" : "text-neutral-400"
                        }`}
                      >
                        {el.met ? "\u2713" : "\u2717"} {el.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Enforcement precedent for this cause of action */}
                {coa.matchingCases.length > 0 && (
                  <div className="mt-3 ml-4 border-l border-neutral-200 pl-4">
                    <p className="text-xs font-semibold text-neutral-600 mb-2">
                      Enforcement precedent for {coa.name.toLowerCase()}:
                    </p>
                    <div className="space-y-1.5">
                      {coa.matchingCases.map((c) => (
                        <div key={c.id}>
                          <button
                            onClick={() =>
                              setExpandedCase(expandedCase === c.id ? null : c.id)
                            }
                            className="w-full text-left flex items-center gap-2 text-xs hover:bg-neutral-50 rounded px-1 py-0.5 -mx-1 transition-colors"
                          >
                            <span className="font-bold text-[#111] whitespace-nowrap">
                              {formatDollars(c.settlementAmount)}
                            </span>
                            <span className="text-neutral-700">
                              <em>{c.caseName}</em>{" "}
                              <span className="text-neutral-400">({c.year})</span>
                            </span>
                            <span className="ml-auto text-neutral-400">
                              {expandedCase === c.id ? "\u25B2" : "\u25BC"}
                            </span>
                          </button>
                          {expandedCase === c.id && (
                            <div className="text-xs text-neutral-600 mt-1 mb-2 pl-1 space-y-1">
                              <p>{c.description}</p>
                              {c.structuredMetrics && (
                                <div className="bg-neutral-100 rounded px-2 py-1.5 text-xs">
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
                                  className="text-[#111] underline hover:opacity-60 inline-block"
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
        <p className="text-xs text-neutral-500 mb-4">
          Federal and state fair lending enforcement activity ({summary.yearRange.earliest}-{summary.yearRange.latest})
        </p>
        <div className="grid grid-cols-4 gap-8">
          {[
            { value: String(summary.totalCases), label: "enforcement actions" },
            { value: formatDollars(summary.totalSettlementDollars), label: "total settlements" },
            { value: String(summary.byTheory.redlining), label: "redlining cases" },
            { value: String(summary.byType.doj), label: "DOJ-led cases" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-bold text-[#111]">{s.value}</p>
              <p className="text-[11px] text-neutral-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
