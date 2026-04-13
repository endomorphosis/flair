"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { DenialRateEntry, DisparityRatio } from "@/lib/computations";
import DenialRateChart from "@/components/DenialRateChart";
import DisparityProfile from "@/components/DisparityProfile";
import PeerComparison from "@/components/PeerComparison";
import TrendChart from "@/components/TrendChart";
import LegalAnalysis from "@/components/LegalAnalysis";
import GeographicAnalysis from "@/components/GeographicAnalysis";
import StratifiedAnalysis from "@/components/StratifiedAnalysis";
import DataQuality from "@/components/DataQuality";
import { US_STATES } from "@/lib/constants";

interface DisparityData {
  denialRates: DenialRateEntry[];
  disparityRatios: DisparityRatio[];
}

interface TrendYear {
  year: number;
  denialRates: DenialRateEntry[];
  disparityRatios: DisparityRatio[];
}

/** Minimal summary extracted from /api/stratified for Legal tab */
interface ControlledDisparitySummary {
  significantInConventionalPurchase: boolean;
  cmhLoanTypeSignificant: boolean;
  cmhIncomeBandSignificant: boolean;
  incomeBandsAvailable: boolean;
  anyGroupUnderpowered: boolean;
}

const TABS = [
  { id: "disparity", label: "Disparity" },
  { id: "peers", label: "Peers & Trends" },
  { id: "geographic", label: "Geography" },
  { id: "controls", label: "Controls" },
  { id: "legal", label: "Legal" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function ResultsContent() {
  const searchParams = useSearchParams();
  const lei = searchParams.get("lei") || "";
  const name = searchParams.get("name") || "";
  const state = searchParams.get("state") || "";
  const msa = searchParams.get("msa") || "";
  const msaName = searchParams.get("msaName") || "";
  const years = searchParams.get("years") || searchParams.get("year") || "2023";

  // Display label: "2023" or "2021-2024"
  const yearsList = years.split(",").map(Number);
  const yearLabel = yearsList.length > 1
    ? `${yearsList[0]}-${yearsList[yearsList.length - 1]}`
    : String(yearsList[0]);

  const geoLabel = msaName || US_STATES[state] || state;
  const geoParam = msa ? `msa=${msa}` : `state=${state}`;

  const [activeTab, setActiveTab] = useState<TabId>("disparity");
  const [disparity, setDisparity] = useState<DisparityData | null>(null);
  const [peers, setPeers] = useState<DisparityData | null>(null);
  const [trends, setTrends] = useState<TrendYear[] | null>(null);
  const [controlledDisparity, setControlledDisparity] = useState<ControlledDisparitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lei || (!state && !msa)) return;

    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/disparity?lei=${lei}&${geoParam}&years=${years}`).then((r) =>
        r.json()
      ),
      fetch(`/api/peers?${geoParam}&years=${years}`).then((r) => r.json()),
      fetch(`/api/trends?lei=${lei}&${geoParam}`).then((r) => r.json()),
    ])
      .then(([disparityData, peersData, trendsData]) => {
        setDisparity(disparityData);
        setPeers(peersData);
        setTrends(trendsData.trends || []);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [lei, state, msa, years]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch stratified data in background for Legal tab summary
  useEffect(() => {
    if (!lei || (!state && !msa)) return;
    fetch(`/api/stratified?lei=${lei}&${geoParam}&years=${years}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return;
        const summary: ControlledDisparitySummary = {
          significantInConventionalPurchase:
            d.conventionalPurchase?.disparityRatios?.some(
              (r: DisparityRatio) => r.chiSquare?.significant
            ) ?? false,
          cmhLoanTypeSignificant:
            d.loanTypeCMH?.some((e: { cmh: { significant: boolean } }) => e.cmh.significant) ?? false,
          cmhIncomeBandSignificant:
            d.incomeBandCMH?.some((e: { cmh: { significant: boolean } }) => e.cmh.significant) ?? false,
          incomeBandsAvailable: d.incomeBandsAvailable ?? false,
          anyGroupUnderpowered:
            d.powerAnalysis?.some(
              (e: { mde: { adequateFor1_5: boolean } | null }) =>
                e.mde && !e.mde.adequateFor1_5
            ) ?? false,
        };
        setControlledDisparity(summary);
      })
      .catch(() => {});
  }, [lei, state, msa, years]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!lei || (!state && !msa)) {
    return (
      <div className="min-h-[calc(100vh-3rem)] flex items-center justify-center">
        <p className="text-neutral-400">Missing lender or geography parameter.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3rem)]">
      {/* Results header */}
      <div className="bg-[#111] text-white">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">{name}</h1>
              <p className="text-neutral-500 text-[13px] mt-0.5">
                {geoLabel} &middot; {yearLabel}
                {disparity && (
                  <> &middot; {disparity.denialRates.reduce((s, r) => s + r.applications, 0).toLocaleString()} applications</>
                )}
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="text-[12px] tracking-wide text-neutral-500 hover:text-white transition-colors print:hidden"
            >
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200 bg-white print:hidden sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex gap-8">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.id
                    ? "border-[#111] text-[#111]"
                    : "border-transparent text-neutral-400 hover:text-neutral-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {loading && (
          <div className="text-center py-24">
            <div className="inline-block w-6 h-6 border-2 border-neutral-300 border-t-[#111] rounded-full animate-spin" />
            <p className="mt-4 text-sm text-neutral-400">
              Loading HMDA data...
            </p>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 py-4">
            Error: {error}
          </div>
        )}

        {!loading && !error && disparity && (
          <>
            {/* Tab: Disparity */}
            <div className={activeTab === "disparity" ? "space-y-10" : "hidden print:block print:space-y-10"}>
              <DisparityProfile
                ratios={disparity.disparityRatios}
                lenderName={name}
                state={geoLabel}
                yearLabel={yearLabel}
              />
              <DenialRateChart
                data={disparity.denialRates}
                title={`Denial Rates by Race — ${yearLabel}`}
              />
            </div>

            {/* Tab: Peers & Trends */}
            <div className={activeTab === "peers" ? "space-y-10" : "hidden print:block print:space-y-10"}>
              {peers && peers.disparityRatios.length > 0 ? (
                <PeerComparison
                  lenderRatios={disparity.disparityRatios}
                  marketRatios={peers.disparityRatios}
                  lenderName={name}
                  state={geoLabel}
                />
              ) : (
                <p className="text-sm text-neutral-400 py-8">
                  Insufficient peer data for comparison.
                </p>
              )}
              {trends && trends.length > 0 && (
                <TrendChart trends={trends} lenderName={name} />
              )}
            </div>

            {/* Tab: Geographic */}
            <div className={activeTab === "geographic" ? "" : "hidden print:block"}>
              {state ? (
                <GeographicAnalysis
                  lei={lei}
                  state={state}
                  years={years}
                  lenderName={name}
                  geoLabel={geoLabel}
                  yearLabel={yearLabel}
                />
              ) : (
                <p className="text-sm text-neutral-400 py-8">
                  Geographic analysis requires a state selection.
                </p>
              )}
            </div>

            {/* Tab: Controls (stratified analysis + data quality) */}
            <div className={activeTab === "controls" ? "space-y-16" : "hidden print:block print:space-y-16"}>
              <StratifiedAnalysis
                lei={lei}
                state={state || undefined}
                msa={msa || undefined}
                years={years}
                lenderName={name}
                geoLabel={geoLabel}
                yearLabel={yearLabel}
              />
              <div className="border-t border-neutral-200 pt-10">
                <DataQuality
                  lei={lei}
                  state={state || undefined}
                  msa={msa || undefined}
                  years={years}
                  lenderName={name}
                  geoLabel={geoLabel}
                  yearLabel={yearLabel}
                />
              </div>
            </div>

            {/* Tab: Legal */}
            <div className={activeTab === "legal" ? "" : "hidden print:block"}>
              <LegalAnalysis
                disparityRatios={disparity.disparityRatios}
                marketRatios={peers?.disparityRatios || []}
                trends={trends || []}
                lenderName={name}
                geoLabel={geoLabel}
                state={state}
                lei={lei}
                years={years}
                yearLabel={yearLabel}
                controlledDisparity={controlledDisparity}
              />
            </div>
          </>
        )}
      </main>

      {/* Print-only */}
      <div className="hidden print:block text-center text-[11px] text-neutral-400 py-4 border-t border-neutral-200 mt-8">
        Generated by FLAIR (Fair Lending AI Radar) |
        Data source: CFPB HMDA Data Browser | try-flair.vercel.app
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-3rem)] flex items-center justify-center">
          <p className="text-neutral-400 text-sm">Loading...</p>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
