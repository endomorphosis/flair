"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { DenialRateEntry, DisparityRatio } from "@/lib/computations";
import DenialRateChart from "@/components/DenialRateChart";
import DisparityProfile from "@/components/DisparityProfile";
import PeerComparison from "@/components/PeerComparison";
import TrendChart from "@/components/TrendChart";
import LegalSidebar from "@/components/LegalSidebar";
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
  { id: "disparity", label: "Disparity Profile" },
  { id: "peers", label: "Peers & Trends" },
  { id: "geographic", label: "Geographic" },
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
      <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Missing lender or geography parameter.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50">
      {/* Results header */}
      <div className="bg-slate-800 text-white">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-xl font-bold">{name}</h1>
            <button
              onClick={() => window.print()}
              className="text-sm px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors print:hidden"
            >
              Export PDF
            </button>
          </div>
          <p className="text-slate-400 text-sm">
            {geoLabel} | {year} HMDA Data
            {disparity && (
              <> | {disparity.denialRates.reduce((s, r) => s + r.applications, 0).toLocaleString()} total applications</>
            )}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 print:hidden">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
            <p className="mt-4 text-slate-500">
              Fetching HMDA data and computing disparities...
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            Error: {error}
          </div>
        )}

        {!loading && !error && disparity && (
          <>
            {/* Tab: Disparity Profile */}
            <div className={activeTab === "disparity" ? "space-y-8" : "hidden print:block print:space-y-8"}>
              <DisparityProfile
                ratios={disparity.disparityRatios}
                lenderName={name}
                state={geoLabel}
                year={year}
              />
              <DenialRateChart
                data={disparity.denialRates}
                title={`Denial Rates by Race — ${name}, ${geoLabel} (${year})`}
              />
            </div>

            {/* Tab: Peers & Trends */}
            <div className={activeTab === "peers" ? "space-y-8" : "hidden print:block print:space-y-8"}>
              {peers && peers.disparityRatios.length > 0 ? (
                <PeerComparison
                  lenderRatios={disparity.disparityRatios}
                  marketRatios={peers.disparityRatios}
                  lenderName={name}
                  state={geoLabel}
                />
              ) : (
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 text-center text-slate-500">
                  Insufficient peer data for comparison.
                </div>
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
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 text-center text-slate-500">
                  Geographic analysis requires a state selection (not available
                  for MSA-only queries).
                </div>
              )}
            </div>

            {/* Tab: Legal */}
            <div className={activeTab === "legal" ? "" : "hidden print:block"}>
              <LegalSidebar lenderName={name} />
            </div>
          </>
        )}
      </main>

      {/* Print-only generation line */}
      <div className="hidden print:block text-center text-xs text-slate-400 py-4 border-t border-slate-200 mt-8">
        Generated by FLAIR (Fair Lending AI Report) |
        Data source: CFPB HMDA Data Browser | flair-steel.vercel.app
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 flex items-center justify-center">
          <p className="text-slate-500">Loading...</p>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
