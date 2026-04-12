import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="bg-slate-50 min-h-[calc(100vh-3.5rem)]">
      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            The Fair Lending Enforcement Gap
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            In February 2025, Executive Order 14281 directed federal agencies to
            deprioritize disparate impact enforcement — the primary legal theory
            used to combat lending discrimination for over 50 years. FLAIR exists
            to fill the gap.
          </p>
        </div>

        {/* The Problem */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">
            The Problem
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3 text-sm text-slate-700 leading-relaxed">
            <p>
              For decades, the DOJ and CFPB used HMDA data to identify mortgage
              lenders with statistically significant racial disparities in
              denial rates, lending patterns, and geographic coverage. These
              investigations led to landmark settlements — $175M against Wells
              Fargo (2012), $31M against City National Bank (2024), $8M against
              Fairway Independent Mortgage (2024).
            </p>
            <p>
              With the shift in federal enforcement priorities, private fair
              lending litigation under the Equal Credit Opportunity Act (ECOA)
              and the Fair Housing Act (FHA) remains viable — but legal aid
              attorneys and civil rights organizations lost their investigative
              partner. They know disparities exist. They just can&apos;t easily
              prove it.
            </p>
          </div>
        </section>

        {/* The Gap */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">
            The Gap
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-sm text-slate-700 leading-relaxed">
            <p>
              Federal regulators had sophisticated analytical tools to process
              HMDA data — the same data that every mortgage lender in America is
              required to report. But this data is locked behind a complex API,
              requires statistical expertise to analyze, and has no accessible
              interface for attorneys who need evidence for fair lending claims,
              HUD complaints, or community advocacy.
            </p>
          </div>
        </section>

        {/* What FLAIR Does */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">
            What FLAIR Does
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
              <div className="text-2xl font-bold text-slate-300 mb-2">1</div>
              <h3 className="font-semibold text-slate-900 mb-1">Search</h3>
              <p className="text-sm text-slate-600">
                Enter a lender name and geography. We resolve it to their
                federal HMDA identifier (LEI).
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
              <div className="text-2xl font-bold text-slate-300 mb-2">2</div>
              <h3 className="font-semibold text-slate-900 mb-1">Analyze</h3>
              <p className="text-sm text-slate-600">
                We compute denial rates by race, disparity ratios, peer
                comparisons, geographic lending patterns, and multi-year trends.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
              <div className="text-2xl font-bold text-slate-300 mb-2">3</div>
              <h3 className="font-semibold text-slate-900 mb-1">Act</h3>
              <p className="text-sm text-slate-600">
                Use the disparity profile to assess ECOA/FHA claims, file HUD
                complaints, support demand letters, or refer cases to DOJ.
              </p>
            </div>
          </div>
        </section>

        {/* Enforcement Context */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">
            What&apos;s at Stake
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-sm text-slate-600 mb-4">
              Recent DOJ fair lending settlements show the scale of harm that
              statistical evidence can uncover:
            </p>
            <div className="space-y-3">
              {[
                { amount: "$175M", name: "DOJ v. Wells Fargo", year: 2012, desc: "Discriminatory pricing and steering of Black/Hispanic borrowers" },
                { amount: "$31M", name: "DOJ v. City National Bank", year: 2024, desc: "Redlining — only 7% of loans in majority-Black/Latino census tracts" },
                { amount: "$10.6M", name: "DOJ v. Bancorpsouth", year: 2016, desc: "Denial rate disparities and redlining in Memphis MSA" },
                { amount: "$8M", name: "DOJ v. Fairway Independent Mortgage", year: 2024, desc: "3x fewer applications from majority-Black neighborhoods vs. peers" },
                { amount: "$6.5M", name: "DOJ v. Citadel FCU", year: 2024, desc: "Peers generated applications at 3x Citadel's rate in minority areas" },
              ].map((c) => (
                <div key={c.name} className="flex gap-3 text-sm">
                  <span className="font-bold text-slate-900 whitespace-nowrap w-16">{c.amount}</span>
                  <div>
                    <span className="font-medium text-slate-800">{c.name}</span>
                    <span className="text-slate-500"> ({c.year})</span>
                    <span className="text-slate-600"> — {c.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-block px-8 py-3 bg-slate-900 text-white rounded-lg text-base font-medium hover:bg-slate-800 transition-colors"
          >
            Search for a Lender
          </Link>
        </div>
      </main>
    </div>
  );
}
