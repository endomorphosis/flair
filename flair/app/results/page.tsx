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

const TABS = [
  { id: "disparity", label: "Disparity" },
  { id: "peers", label: "Peers & Trends" },
  { id: "geographic", label: "Geography" },
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
  const year = parseInt(searchParams.get("year") || "2023");

  const geoLabel = msaName || US_STATES[state] || state;
  const geoParam = msa ? `msa=${msa}` : `state=${state}`;

  const [activeTab, setActiveTab] = useState<TabId>("disparity");
  const [disparity, setDisparity] = useState<DisparityData | null>(null);
  const [peers, setPeers] = useState<DisparityData | null>(null);
  const [trends, setTrends] = useState<TrendYear[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lei || (!state && !msa)) return;

    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/disparity?lei=${lei}&${geoParam}&year=${year}`).then((r) =>
        r.json()
      ),
      fetch(`/api/peers?${geoParam}&year=${year}`).then((r) => r.json()),
      fetch(`/api/trends?lei=${lei}&${geoParam}`).then((r) => r.json()),
    ])
      .then(([disparityData, peersData, trendsData]) => {
        setDisparity(disparityData);
        setPeers(peersData);
        setTrends(trendsData.trends || []);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [lei, state, msa, year]); // eslint-disable-line react-hooks/exhaustive-deps

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
                {geoLabel} &middot; {year}
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
                year={year}
              />
              <DenialRateChart
                data={disparity.denialRates}
                title={`Denial Rates by Race — ${year}`}
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
                  year={year}
                  lenderName={name}
                  geoLabel={geoLabel}
                />
              ) : (
                <p className="text-sm text-neutral-400 py-8">
                  Geographic analysis requires a state selection.
                </p>
              )}
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
                year={year}
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
