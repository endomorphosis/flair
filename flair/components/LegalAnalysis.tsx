"use client";

import { useEffect, useState } from "react";
import { DisparityRatio } from "@/lib/computations";

interface TrendYear {
  year: number;
  disparityRatios: DisparityRatio[];
}

interface CaseResult {
  id: string;
  case_name: string;
  court?: string;
  date_filed?: string | null;
  snippet: string;
  source: "midpage" | "trustfoundry";
  url?: string;
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

  // Check if lender is outlier vs market
  const isOutlier = disparityRatios.some((lr) => {
    const mr = marketRatios.find((m) => m.group === lr.group);
    return mr && lr.ratio - mr.ratio > 0.1;
  });

  // Check multi-year persistence
  const persistentYears = trends.filter(
    (t) => t.disparityRatios.length > 0 && t.disparityRatios[0].ratio >= 1.5
  ).length;
  const isPersistent = persistentYears >= 2;

  // Geographic gap
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
      status: hasGeoGap ? "supported" : geoGap === null ? "not_supported" : "not_supported",
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

function buildCausesOfAction(evidence: EvidenceItem[]): CauseOfAction[] {
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
    });
  }

  if (hasGeoGap) {
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
    });
  }

  return causes;
}

function buildMidpageQueries(evidence: EvidenceItem[]): string[] {
  const queries: string[] = [];
  if (evidence[0].status === "supported") {
    queries.push(
      '"disparate impact" AND "denial rate" AND ("mortgage" OR "lending") AND ("ECOA" OR "Fair Housing Act")'
    );
  }
  if (evidence[3].status === "supported") {
    queries.push(
      '"redlining" AND "Fair Housing Act" AND ("majority-minority" OR "majority-Black")'
    );
  }
  if (evidence[2].status === "supported") {
    queries.push('"pattern or practice" AND "fair lending" AND "mortgage"');
  }
  if (queries.length === 0) {
    queries.push('"fair lending" AND "ECOA" AND "mortgage" AND "denial"');
  }
  return queries;
}

function buildFactPattern(
  lenderName: string,
  disparityRatios: DisparityRatio[],
  marketRatios: DisparityRatio[],
  geoGap: number | null
): string {
  const parts: string[] = [];
  const worst = disparityRatios[0];
  if (worst) {
    parts.push(
      `Mortgage lender denied ${worst.label} applicants at ${worst.ratio.toFixed(1)}x the rate of White applicants`
    );
  }
  const worstMarket = worst
    ? marketRatios.find((m) => m.group === worst.group)
    : null;
  if (worstMarket) {
    parts.push(
      `Peer lenders in the same geography showed a ${worstMarket.ratio.toFixed(1)}x ratio`
    );
  }
  if (geoGap !== null && geoGap < -5) {
    parts.push(
      `The lender's share of applications in majority-minority counties was ${Math.abs(geoGap).toFixed(0)} percentage points below the market average`
    );
  }
  return parts.join(". ") + ".";
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
  const [cases, setCases] = useState<CaseResult[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [expandedCase, setExpandedCase] = useState<string | null>(null);
  const [geoGap, setGeoGap] = useState<number | null>(null);

  // Fetch geographic gap for evidence assessment
  useEffect(() => {
    if (!state) return;
    fetch(`/api/geographic?lei=${lei}&state=${state}&year=${year}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setGeoGap(d.gap);
      })
      .catch(() => {});
  }, [lei, state, year]);

  const evidence = buildEvidenceItems(disparityRatios, marketRatios, trends, geoGap);
  const causesOfAction = buildCausesOfAction(evidence);

  // Fetch cases from both Midpage and TrustFoundry
  useEffect(() => {
    setCasesLoading(true);
    const midpageQueries = buildMidpageQueries(evidence);
    const factPattern = buildFactPattern(
      lenderName,
      disparityRatios,
      marketRatios,
      geoGap
    );

    const midpagePromises = midpageQueries.map((q) =>
      fetch(`/api/midpage?query=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d): CaseResult[] =>
          (d.results || []).map(
            (r: { opinion_id: string; case_name: string; court_abbreviation?: string; court_name?: string; date_filed: string | null; snippet: string }) => ({
              id: `mp-${r.opinion_id}`,
              case_name: r.case_name,
              court: r.court_abbreviation || r.court_name,
              date_filed: r.date_filed,
              snippet: r.snippet,
              source: "midpage" as const,
            })
          )
        )
        .catch(() => [] as CaseResult[])
    );

    const tfPromise = fetch(
      `/api/trustfoundry?facts=${encodeURIComponent(factPattern)}`
    )
      .then((r) => r.json())
      .then((d): CaseResult[] =>
        (d.results || [])
          .filter((r: { result_type: string }) => r.result_type === "case")
          .map((r: { uuid: string; header: string; excerpt: string; url?: string }) => ({
            id: `tf-${r.uuid}`,
            case_name: r.header,
            snippet: r.excerpt,
            source: "trustfoundry" as const,
            url: r.url,
          }))
      )
      .catch(() => [] as CaseResult[]);

    Promise.all([...midpagePromises, tfPromise]).then((results) => {
      const all = results.flat();
      // Deduplicate by case name (rough match)
      const seen = new Set<string>();
      const deduped = all.filter((c) => {
        const key = c.case_name.toLowerCase().replace(/[^a-z]/g, "").slice(0, 30);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setCases(deduped.slice(0, 10));
      setCasesLoading(false);
    });
  }, [lenderName, geoGap]); // eslint-disable-line react-hooks/exhaustive-deps

  const supportedCount = evidence.filter((e) => e.status === "supported").length;

  return (
    <div className="space-y-6">
      {/* Section 1: Evidence Assessment */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">
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

      {/* Section 2: Causes of Action */}
      {causesOfAction.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">
            Available Causes of Action
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Legal theories supported by the screening data
          </p>

          <div className="space-y-4">
            {causesOfAction.map((coa) => (
              <div
                key={coa.name}
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
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Relevant Precedent */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">
          Relevant Precedent
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Cases with similar fact patterns — powered by Midpage and TrustFoundry
        </p>

        {casesLoading && (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
            <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            Searching for cases with similar fact patterns...
          </div>
        )}

        {!casesLoading && cases.length === 0 && (
          <p className="text-sm text-slate-500 py-2">
            No matching precedent found for this fact pattern.
          </p>
        )}

        {!casesLoading && cases.length > 0 && (
          <div className="space-y-2">
            {cases.map((c) => (
              <div
                key={c.id}
                className="border border-slate-200 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedCase(expandedCase === c.id ? null : c.id)
                  }
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {c.case_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {c.court && <>{c.court} | </>}
                      {c.date_filed && <>{c.date_filed} | </>}
                      {c.source === "midpage" ? "Midpage" : "TrustFoundry"}
                    </p>
                  </div>
                  <span className="text-slate-400 text-sm ml-2">
                    {expandedCase === c.id ? "\u25B2" : "\u25BC"}
                  </span>
                </button>
                {expandedCase === c.id && (
                  <div className="px-4 pb-3 border-t border-slate-100">
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      {c.snippet}
                    </p>
                    {c.url && (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                      >
                        View full opinion
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
