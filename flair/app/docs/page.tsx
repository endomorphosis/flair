export default function DocsPage() {
  return (
    <div className="bg-slate-50 min-h-[calc(100vh-3.5rem)]">
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Documentation</h1>

        {/* Data Sources */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">
            Data Sources
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 text-sm text-slate-700">
            <div>
              <h3 className="font-semibold text-slate-900">HMDA Data Browser API</h3>
              <p>
                Federal data reported by ~5,000 mortgage lenders under the Home
                Mortgage Disclosure Act. Hosted by the CFPB at{" "}
                <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                  ffiec.cfpb.gov
                </code>
                . Includes application outcomes, race/ethnicity, geography,
                loan type, and lender identity. Updated annually; 2018-2024
                data available.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">U.S. Census ACS 5-Year Estimates</h3>
              <p>
                County-level demographic data from the American Community Survey
                (2022). Used to classify counties as majority-minority (&gt;50%
                non-Hispanic non-White population) for geographic lending pattern
                analysis.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Midpage</h3>
              <p>
                Legal research API providing keyword search across 13M+ federal
                and state court opinions. Used to find ECOA/FHA cases naming the
                searched lender.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">TrustFoundry</h3>
              <p>
                Legal search API across 8M+ statutes, regulations, and cases.
                Used to surface relevant ECOA, Fair Housing Act, and Regulation
                B provisions.
              </p>
            </div>
          </div>
        </section>

        {/* Methodology */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">
            Methodology
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 text-sm text-slate-700">
            <div>
              <h3 className="font-semibold text-slate-900">Denial Rate</h3>
              <p>
                Computed as: applications denied / (applications denied +
                applications originated) for each racial/ethnic group. Only
                action codes 1 (originated) and 3 (denied) are included.
                Withdrawn, incomplete, and purchased applications are excluded.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Disparity Ratio</h3>
              <p>
                Denial rate for a racial group divided by the denial rate for
                White applicants. A ratio of 2.0x means the group is denied at
                twice the rate of White applicants. Groups with fewer than 30
                applications are excluded from ratio calculations to avoid
                unreliable statistics, but can be toggled on in the chart via
                checkboxes.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Peer Comparison</h3>
              <p>
                Compares the lender&apos;s disparity ratios against the aggregate of
                all lenders in the same geography (statewide or MSA-level). When
                an MSA is selected, the comparison narrows to that metro area —
                matching the methodology DOJ uses to define peer lenders.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Geographic Analysis</h3>
              <p>
                Counties are classified as majority-minority or majority-White
                using Census ACS data. The lender&apos;s share of applications in
                majority-minority counties is compared to the market average. A
                significant gap (5+ percentage points below market) may indicate
                potential redlining concerns. This mirrors the methodology cited
                in DOJ redlining complaints (e.g., DOJ v. City National Bank,
                2024).
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Trend Analysis</h3>
              <p>
                Disparity ratios are computed for each year from 2020 to 2024,
                showing whether disparities are persistent, improving, or
                worsening. Persistent multi-year disparities strengthen the
                evidentiary basis for fair lending claims.
              </p>
            </div>
          </div>
        </section>

        {/* Legal Framework */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">
            Legal Framework
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 text-sm text-slate-700">
            <div>
              <h3 className="font-semibold text-slate-900">
                Equal Credit Opportunity Act (ECOA) — 15 U.S.C. &sect; 1691
              </h3>
              <p>
                Prohibits discrimination in credit transactions on the basis of
                race, color, religion, national origin, sex, marital status, or
                age. Implemented by Regulation B (12 C.F.R. Part 1002).
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                Fair Housing Act (FHA) — 42 U.S.C. &sect; 3605
              </h3>
              <p>
                Prohibits discrimination in residential real estate-related
                transactions, including mortgage lending.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                Disparate Impact Standard
              </h3>
              <p>
                Under <em>Texas Dep&apos;t of Housing v. Inclusive Communities
                Project</em> (2015), the Supreme Court held that statistical
                evidence of racial disparities can establish prima facie
                liability under the Fair Housing Act without requiring proof of
                discriminatory intent. FLAIR&apos;s statistical screening produces
                the type of evidence used in disparate impact analysis.
              </p>
            </div>
          </div>
        </section>

        {/* Limitations */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">
            Limitations
          </h2>
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-6 space-y-3 text-sm text-amber-900">
            <p>
              <strong>FLAIR is a statistical screening tool, not a
              regression analysis.</strong> It does not control for
              creditworthiness factors (credit score, DTI, LTV ratio) that
              affect lending decisions. These variables are not available in
              public HMDA data — they require litigation discovery or
              government subpoenas (CIDs).
            </p>
            <p>
              Disparity ratios identify where disparities exist, not why they
              exist. A qualified expert witness and regression analysis are
              required for litigation. FLAIR helps attorneys identify which
              lenders warrant further investigation.
            </p>
            <p>
              This tool does not perform matched-pairs analysis (requires
              internal loan files) or damage calculations (requires
              case-specific facts).
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
