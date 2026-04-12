import Link from "next/link";
import { getEnforcementSummary, getTotalSettlementAmount, ENFORCEMENT_CASES } from "@/lib/enforcement-cases";

export default function AboutPage() {
  const summary = getEnforcementSummary();
  const totalDollars = getTotalSettlementAmount();
  const recentCases = ENFORCEMENT_CASES
    .filter((c) => c.year >= 2021)
    .sort((a, b) => b.settlementAmount - a.settlementAmount);

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-3.5rem)]">
      {/* Hero */}
      <div className="bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <p className="text-sm font-medium text-amber-400 tracking-wide uppercase mb-3">
            The Problem
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
            Federal fair lending enforcement<br />
            just went dark.
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Executive Order 14281 (Feb 2025) directed agencies to deprioritize
            disparate impact enforcement — the legal theory behind{" "}
            <span className="text-white font-semibold">
              ${(totalDollars / 1_000_000_000).toFixed(1)}B+ in fair lending settlements
            </span>{" "}
            over the past decade.
          </p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Impact stats */}
        <section className="mb-16 -mt-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center shadow-sm">
              <p className="text-3xl font-bold text-slate-900">~5,000</p>
              <p className="text-xs text-slate-500 mt-1">HMDA filers report annually</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center shadow-sm">
              <p className="text-3xl font-bold text-slate-900">{summary.totalCases}</p>
              <p className="text-xs text-slate-500 mt-1">enforcement actions tracked</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center shadow-sm">
              <p className="text-3xl font-bold text-slate-900">
                ${(totalDollars / 1_000_000_000).toFixed(1)}B
              </p>
              <p className="text-xs text-slate-500 mt-1">total settlements</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center shadow-sm">
              <p className="text-3xl font-bold text-red-600">1</p>
              <p className="text-xs text-slate-500 mt-1">
                public screening tool for advocates
              </p>
            </div>
          </div>
        </section>

        {/* The Funnel */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold text-slate-900 mb-6 text-center">
            The Enforcement Funnel
          </h2>
          <div className="max-w-lg mx-auto space-y-0">
            {[
              { label: "HMDA filers reporting data", value: "~5,000", width: "100%", bg: "bg-slate-200" },
              { label: "Lenders with statistically significant disparities", value: "Hundreds", width: "75%", bg: "bg-slate-300" },
              { label: "Fair housing complaints filed per year", value: "~30,000", width: "55%", bg: "bg-amber-200" },
              { label: "Lending-related complaints", value: "~2,500", width: "40%", bg: "bg-amber-300" },
              { label: "Formal DOJ/CFPB investigations per year", value: "~50-100", width: "25%", bg: "bg-red-200" },
              { label: "Public enforcement settlements (last decade)", value: String(summary.totalCases), width: "15%", bg: "bg-red-400 text-white" },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-4">
                <div
                  className={`${step.bg} rounded-lg py-2.5 px-4 text-center flex-shrink-0 transition-all`}
                  style={{ width: step.width, minWidth: "80px" }}
                >
                  <span className="text-sm font-bold">{step.value}</span>
                </div>
                <p className="text-xs text-slate-600 leading-tight">{step.label}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-slate-500 mt-6 max-w-md mx-auto">
            The bottleneck isn&apos;t the problem — it&apos;s the{" "}
            <strong>capacity to investigate</strong>. DOJ&apos;s Fair Lending Unit
            has ~20-30 attorneys. FLAIR puts screening power in the hands of
            every legal aid org in the country.
          </p>
        </section>

        {/* Before / After */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold text-slate-900 mb-6 text-center">
            Before and After FLAIR
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-red-50 rounded-xl border border-red-200 p-6">
              <h3 className="font-semibold text-red-900 mb-3">Without FLAIR</h3>
              <ul className="space-y-2 text-sm text-red-800">
                <li className="flex gap-2">
                  <span className="text-red-400 mt-0.5">{"\u00d7"}</span>
                  HMDA data locked behind complex API
                </li>
                <li className="flex gap-2">
                  <span className="text-red-400 mt-0.5">{"\u00d7"}</span>
                  Requires statistical expertise to analyze
                </li>
                <li className="flex gap-2">
                  <span className="text-red-400 mt-0.5">{"\u00d7"}</span>
                  No peer comparison — no way to identify outliers
                </li>
                <li className="flex gap-2">
                  <span className="text-red-400 mt-0.5">{"\u00d7"}</span>
                  No connection between data and legal framework
                </li>
                <li className="flex gap-2">
                  <span className="text-red-400 mt-0.5">{"\u00d7"}</span>
                  Attorneys rely on DOJ investigations that are no longer happening
                </li>
              </ul>
            </div>
            <div className="bg-green-50 rounded-xl border border-green-200 p-6">
              <h3 className="font-semibold text-green-900 mb-3">With FLAIR</h3>
              <ul className="space-y-2 text-sm text-green-800">
                <li className="flex gap-2">
                  <span className="text-green-500 mt-0.5">{"\u2713"}</span>
                  Search any lender by name in seconds
                </li>
                <li className="flex gap-2">
                  <span className="text-green-500 mt-0.5">{"\u2713"}</span>
                  Automated disparity analysis by race and geography
                </li>
                <li className="flex gap-2">
                  <span className="text-green-500 mt-0.5">{"\u2713"}</span>
                  Peer comparison flags outliers vs. market average
                </li>
                <li className="flex gap-2">
                  <span className="text-green-500 mt-0.5">{"\u2713"}</span>
                  Evidence mapped to ECOA/FHA causes of action
                </li>
                <li className="flex gap-2">
                  <span className="text-green-500 mt-0.5">{"\u2713"}</span>
                  Enforcement benchmark shows if disparity exceeds DOJ thresholds
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold text-slate-900 mb-6 text-center">
            How It Works
          </h2>
          {/* Flow diagram */}
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-0 max-w-3xl mx-auto">
            {[
              { step: "1", title: "Search", desc: "Lender name + geography", color: "bg-slate-800 text-white" },
              { step: "", title: "", desc: "", color: "" },
              { step: "2", title: "Analyze", desc: "HMDA denial rates, peers, geography", color: "bg-blue-600 text-white" },
              { step: "", title: "", desc: "", color: "" },
              { step: "3", title: "Map to Law", desc: "Evidence checklist + causes of action", color: "bg-amber-500 text-white" },
              { step: "", title: "", desc: "", color: "" },
              { step: "4", title: "Act", desc: "HUD complaint, demand letter, DOJ referral", color: "bg-red-600 text-white" },
            ].map((item, i) =>
              item.step ? (
                <div key={i} className={`${item.color} rounded-xl p-4 text-center flex-1 min-w-0`}>
                  <p className="text-2xl font-bold opacity-50">{item.step}</p>
                  <p className="font-semibold text-sm">{item.title}</p>
                  <p className="text-xs opacity-80 mt-1">{item.desc}</p>
                </div>
              ) : (
                <div key={i} className="text-slate-300 text-2xl px-2 hidden md:block">&rarr;</div>
              )
            )}
          </div>
        </section>

        {/* Recent enforcement */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">
            Recent Enforcement Actions (2021-2026)
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            {recentCases.length} cases since the DOJ Combating Redlining Initiative launched in October 2021
          </p>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {recentCases.slice(0, 8).map((c) => (
              <div key={c.id} className="px-5 py-3 flex items-center gap-4">
                <span className="font-bold text-slate-900 text-sm whitespace-nowrap w-16">
                  ${c.settlementAmount >= 1_000_000
                    ? `${(c.settlementAmount / 1_000_000).toFixed(0)}M`
                    : `${(c.settlementAmount / 1_000).toFixed(0)}K`}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {c.defendant}
                  </p>
                  <p className="text-xs text-slate-500">
                    {c.geography} | {c.year} | {c.legalTheory[0]}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 whitespace-nowrap">
                  {c.type}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="text-center pb-8">
          <Link
            href="/"
            className="inline-block px-8 py-3 bg-slate-900 text-white rounded-lg text-base font-medium hover:bg-slate-800 transition-colors"
          >
            Search for a Lender
          </Link>
          <p className="text-xs text-slate-400 mt-3">
            Built for LLM x Law Hackathon #6 at Stanford CodeX
          </p>
        </div>
      </main>
    </div>
  );
}
