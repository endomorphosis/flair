import Link from "next/link";
import { getEnforcementSummary, getTotalSettlementAmount, ENFORCEMENT_CASES } from "@/lib/enforcement-cases";

export default function AboutPage() {
  const summary = getEnforcementSummary();
  const totalDollars = getTotalSettlementAmount();
  const recentCases = ENFORCEMENT_CASES
    .filter((c) => c.year >= 2021)
    .sort((a, b) => b.settlementAmount - a.settlementAmount);

  return (
    <div className="min-h-[calc(100vh-3rem)]">
      {/* Hero */}
      <div className="bg-[#111] text-white">
        <div className="max-w-3xl mx-auto px-6 py-20">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-6 leading-tight">
            Mortgage lending disparities are widespread.<br />
            The tools to find them aren&apos;t.
          </h1>
          <p className="text-neutral-400 text-base leading-relaxed max-w-xl">
            Every year, ~5,000 lenders report mortgage data to the federal
            government. Hundreds have statistically significant racial
            disparities. But only the DOJ and CFPB had the tools to screen
            for them — and enforcement has fallen sharply since Executive
            Order 14281 deprioritized disparate impact cases in February 2025.
          </p>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Stats */}
        <section className="mb-20">
          <div className="grid grid-cols-4 gap-8">
            {[
              { value: "~5,000", label: "HMDA filers" },
              { value: String(summary.totalCases), label: "enforcement actions" },
              { value: `$${(totalDollars / 1_000_000_000).toFixed(1)}B`, label: "in settlements" },
              { value: "~25", label: "DOJ fair lending attorneys" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-bold text-[#111]">{s.value}</p>
                <p className="text-[11px] text-neutral-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* The Funnel */}
        <section className="mb-20">
          <p className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-6">
            The Enforcement Funnel
          </p>
          <div className="space-y-2 max-w-md">
            {[
              { value: "~5,000", label: "Lenders reporting HMDA data", pct: 100 },
              { value: "Hundreds", label: "With statistically significant disparities", pct: 70 },
              { value: "~30,000", label: "Fair housing complaints filed/year", pct: 50 },
              { value: "~2,500", label: "Lending-related complaints", pct: 35 },
              { value: "~50–100", label: "Formal DOJ/CFPB investigations/year", pct: 20 },
              { value: String(summary.totalCases), label: "Public settlements (last decade)", pct: 10 },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-4">
                <div
                  className="bg-neutral-900 text-white text-[13px] font-semibold py-2 px-3 flex-shrink-0"
                  style={{ width: `${step.pct}%`, minWidth: "60px" }}
                >
                  {step.value}
                </div>
                <p className="text-[13px] text-neutral-500">{step.label}</p>
              </div>
            ))}
          </div>
          <p className="text-[13px] text-neutral-500 mt-8 max-w-md leading-relaxed">
            The bottleneck isn&apos;t the problem — it&apos;s the
            capacity to investigate. FLAIR puts the same screening power
            federal regulators use into the hands of every legal aid
            organization in the country.
          </p>
        </section>

        {/* Before / After */}
        <section className="mb-20">
          <p className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-6">
            Before and After
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <p className="text-sm font-semibold text-[#111] mb-4">Without FLAIR</p>
              <ul className="space-y-3 text-[13px] text-neutral-500">
                <li className="flex gap-2">
                  <span className="text-neutral-300 mt-px">{"\u2013"}</span>
                  HMDA data locked behind complex API
                </li>
                <li className="flex gap-2">
                  <span className="text-neutral-300 mt-px">{"\u2013"}</span>
                  Requires statistical expertise to analyze
                </li>
                <li className="flex gap-2">
                  <span className="text-neutral-300 mt-px">{"\u2013"}</span>
                  No peer comparison — no way to identify outliers
                </li>
                <li className="flex gap-2">
                  <span className="text-neutral-300 mt-px">{"\u2013"}</span>
                  No connection between data and legal framework
                </li>
                <li className="flex gap-2">
                  <span className="text-neutral-300 mt-px">{"\u2013"}</span>
                  Advocates rely on federal investigations that are declining
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#111] mb-4">With FLAIR</p>
              <ul className="space-y-3 text-[13px] text-neutral-700">
                <li className="flex gap-2">
                  <span className="text-[#111] mt-px">{"\u2192"}</span>
                  Search any lender by name in seconds
                </li>
                <li className="flex gap-2">
                  <span className="text-[#111] mt-px">{"\u2192"}</span>
                  Automated disparity analysis by race and geography
                </li>
                <li className="flex gap-2">
                  <span className="text-[#111] mt-px">{"\u2192"}</span>
                  Peer comparison flags outliers vs. market average
                </li>
                <li className="flex gap-2">
                  <span className="text-[#111] mt-px">{"\u2192"}</span>
                  Evidence mapped to ECOA/FHA causes of action
                </li>
                <li className="flex gap-2">
                  <span className="text-[#111] mt-px">{"\u2192"}</span>
                  Enforcement benchmark against real DOJ thresholds
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mb-20">
          <p className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-6">
            How It Works
          </p>
          <div className="flex items-start gap-8 md:gap-12">
            {[
              { n: "1", title: "Search", desc: "Lender name + geography" },
              { n: "2", title: "Analyze", desc: "Denial rates, peers, geography" },
              { n: "3", title: "Map to Law", desc: "Evidence checklist + causes of action" },
              { n: "4", title: "Act", desc: "HUD complaint, demand letter, referral" },
            ].map((step) => (
              <div key={step.n} className="flex-1">
                <p className="text-2xl font-bold text-neutral-200">{step.n}</p>
                <p className="text-sm font-semibold text-[#111] mt-1">{step.title}</p>
                <p className="text-[13px] text-neutral-500 mt-0.5">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Recent enforcement */}
        <section className="mb-20">
          <p className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-1">
            Recent Enforcement
          </p>
          <p className="text-[13px] text-neutral-400 mb-6">
            {recentCases.length} actions since the DOJ Combating Redlining Initiative (Oct 2021)
          </p>
          <div className="divide-y divide-neutral-200">
            {recentCases.slice(0, 8).map((c) => (
              <div key={c.id} className="py-3 flex items-center gap-4">
                <span className="font-bold text-[#111] text-sm tabular-nums w-14 flex-shrink-0">
                  ${c.settlementAmount >= 1_000_000
                    ? `${(c.settlementAmount / 1_000_000).toFixed(0)}M`
                    : `${(c.settlementAmount / 1_000).toFixed(0)}K`}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#111] truncate">
                    {c.defendant}
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    {c.geography} &middot; {c.year} &middot; {c.legalTheory[0]}
                  </p>
                </div>
                <span className="text-[11px] text-neutral-400 whitespace-nowrap">
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
            className="inline-block px-8 py-3 bg-[#111] text-white text-sm font-medium tracking-wide uppercase hover:bg-[#333] transition-colors"
          >
            Search for a Lender
          </Link>
          <p className="text-[11px] text-neutral-400 mt-4">
            Built for LLM x Law Hackathon #6 at Stanford CodeX
          </p>
        </div>
      </main>
    </div>
  );
}
