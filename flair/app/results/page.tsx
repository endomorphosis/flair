"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { DenialRateEntry, DisparityRatio } from "@/lib/computations";
import DenialRateChart from "@/components/DenialRateChart";
import DisparityProfile from "@/components/DisparityProfile";
import PeerComparison from "@/components/PeerComparison";
import TrendChart from "@/components/TrendChart";
import LegalSidebar from "@/components/LegalSidebar";
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

function ResultsContent() {
  const searchParams = useSearchParams();
  const lei = searchParams.get("lei") || "";
  const name = searchParams.get("name") || "";
  const state = searchParams.get("state") || "";
  const year = parseInt(searchParams.get("year") || "2023");

  const [disparity, setDisparity] = useState<DisparityData | null>(null);
  const [peers, setPeers] = useState<DisparityData | null>(null);
  const [trends, setTrends] = useState<TrendYear[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lei || !state) return;

    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/disparity?lei=${lei}&state=${state}&year=${year}`).then((r) =>
        r.json()
      ),
      fetch(`/api/peers?state=${state}&year=${year}`).then((r) => r.json()),
      fetch(`/api/trends?lei=${lei}&state=${state}`).then((r) => r.json()),
    ])
      .then(([disparityData, peersData, trendsData]) => {
        setDisparity(disparityData);
        setPeers(peersData);
        setTrends(trendsData.trends || []);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [lei, state, year]);

  if (!lei || !state) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Missing lender or state parameter.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <a
            href="/"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            &larr; Back to Search
          </a>
          <h1 className="text-2xl font-bold mt-2">{name}</h1>
          <p className="text-slate-400 text-sm">
            {US_STATES[state] || state} | {year} HMDA Data
            {disparity && (
              <> | {disparity.denialRates.reduce((s, r) => s + r.applications, 0).toLocaleString()} total applications</>
            )}
          </p>
        </div>
      </header>

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
          <div className="space-y-8">
            {/* Disparity ratios */}
            <DisparityProfile
              ratios={disparity.disparityRatios}
              lenderName={name}
              state={US_STATES[state] || state}
              year={year}
            />

            {/* Denial rate chart */}
            <DenialRateChart
              data={disparity.denialRates}
              title={`Denial Rates by Race — ${name}, ${US_STATES[state] || state} (${year})`}
            />

            {/* Peer comparison */}
            {peers && peers.disparityRatios.length > 0 && (
              <PeerComparison
                lenderRatios={disparity.disparityRatios}
                marketRatios={peers.disparityRatios}
                lenderName={name}
                state={US_STATES[state] || state}
              />
            )}

            {/* Trend */}
            {trends && trends.length > 0 && (
              <TrendChart trends={trends} lenderName={name} />
            )}

            {/* Legal layer — case law + statutory provisions */}
            <LegalSidebar lenderName={name} />

            {/* Methodology */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-sm text-slate-600">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Methodology
              </h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Data source: CFPB HMDA Data Browser API (federal data
                  reported by ~5,000 mortgage lenders under the Home Mortgage
                  Disclosure Act)
                </li>
                <li>
                  Denial rate = applications denied / (applications denied +
                  applications originated) for each racial group
                </li>
                <li>
                  Disparity ratio = denial rate for group / denial rate for
                  White applicants
                </li>
                <li>
                  Groups with fewer than 30 applications are flagged as
                  low-sample (n&lt;30) and hidden by default in the chart, but
                  can be toggled on via checkboxes. Groups below this
                  threshold are excluded from disparity ratio calculations.
                </li>
                <li>
                  Peer comparison uses statewide aggregate denial rates across
                  all lenders in the same state
                </li>
                <li>
                  Case law powered by Midpage (keyword search across 13M+
                  federal court opinions). Statutory provisions powered by
                  TrustFoundry (search across 8M+ laws and regulations).
                </li>
                <li>
                  This tool provides statistical screening only. It does not
                  control for creditworthiness factors (credit score, DTI, LTV).
                  Regression analysis by a qualified expert is needed for
                  litigation.
                </li>
              </ul>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        Data source: CFPB HMDA Data Browser | Built for LLM x Law Hackathon #6 at Stanford CodeX
      </footer>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <p className="text-slate-500">Loading...</p>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
