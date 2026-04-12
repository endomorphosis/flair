export default function DocsPage() {
  return (
    <div className="min-h-[calc(100vh-3rem)]">
      <main className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight text-[#111] mb-12">
          Documentation
        </h1>

        {/* Data Sources */}
        <section className="mb-14">
          <p className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-6">
            Data Sources
          </p>
          <div className="space-y-6">
            {[
              {
                name: "HMDA Data Browser API",
                desc: `Federal data reported by ~5,000 mortgage lenders under the Home Mortgage Disclosure Act. Hosted by the CFPB at ffiec.cfpb.gov. Includes application outcomes, race/ethnicity, geography, loan type, and lender identity. Updated annually; 2018–2024 data available.`,
              },
              {
                name: "U.S. Census ACS 5-Year Estimates",
                desc: "County-level demographic data from the American Community Survey (2022). Used to classify counties as majority-minority (>50% non-Hispanic non-White population) for geographic lending pattern analysis.",
              },
              {
                name: "Midpage",
                desc: "Legal research API providing keyword search across 13M+ federal and state court opinions. Used to surface ECOA/FHA cases with similar fact patterns.",
              },
              {
                name: "TrustFoundry",
                desc: "Legal search API across 8M+ statutes, regulations, and cases. Used for fact-pattern case matching based on FLAIR's computed findings.",
              },
            ].map((source) => (
              <div key={source.name} className="border-b border-neutral-200 pb-5">
                <p className="text-sm font-semibold text-[#111] mb-1">{source.name}</p>
                <p className="text-[13px] text-neutral-500 leading-relaxed">{source.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Methodology */}
        <section className="mb-14">
          <p className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-6">
            Methodology
          </p>
          <div className="space-y-6">
            {[
              {
                name: "Denial Rate",
                desc: "Applications denied / (applications denied + applications originated) for each racial/ethnic group. Only action codes 1 (originated) and 3 (denied) are included. Withdrawn, incomplete, and purchased applications are excluded.",
              },
              {
                name: "Disparity Ratio",
                desc: "Denial rate for a racial group divided by the denial rate for White applicants. A ratio of 2.0x means the group is denied at twice the rate. Groups with fewer than 30 applications are excluded from ratio calculations but can be toggled on in the chart.",
              },
              {
                name: "Peer Comparison",
                desc: "Compares the lender's disparity ratios against the aggregate of all lenders in the same geography (statewide or MSA-level). When an MSA is selected, the comparison narrows to that metro area — matching the methodology DOJ uses to define peer lenders.",
              },
              {
                name: "Geographic Analysis",
                desc: "Counties are classified as majority-minority or majority-White using Census ACS data. The lender's share of applications in majority-minority counties is compared to the market average. A gap of 5+ percentage points below market may indicate potential redlining. This mirrors the methodology cited in DOJ complaints (e.g., DOJ v. City National Bank, 2024).",
              },
              {
                name: "Trend Analysis",
                desc: "Disparity ratios computed for 2020–2024 show whether disparities are persistent, improving, or worsening. Persistent multi-year disparities strengthen the evidentiary basis for fair lending claims.",
              },
            ].map((method) => (
              <div key={method.name} className="border-b border-neutral-200 pb-5">
                <p className="text-sm font-semibold text-[#111] mb-1">{method.name}</p>
                <p className="text-[13px] text-neutral-500 leading-relaxed">{method.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Legal Framework */}
        <section className="mb-14">
          <p className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-6">
            Legal Framework
          </p>
          <div className="space-y-6">
            <div className="border-b border-neutral-200 pb-5">
              <p className="text-sm font-semibold text-[#111] mb-1">
                Equal Credit Opportunity Act (ECOA) — 15 U.S.C. &sect; 1691
              </p>
              <p className="text-[13px] text-neutral-500 leading-relaxed">
                Prohibits discrimination in credit transactions on the basis of
                race, color, religion, national origin, sex, marital status, or
                age. Implemented by Regulation B (12 C.F.R. Part 1002).
              </p>
            </div>
            <div className="border-b border-neutral-200 pb-5">
              <p className="text-sm font-semibold text-[#111] mb-1">
                Fair Housing Act (FHA) — 42 U.S.C. &sect; 3605
              </p>
              <p className="text-[13px] text-neutral-500 leading-relaxed">
                Prohibits discrimination in residential real estate-related
                transactions, including mortgage lending.
              </p>
            </div>
            <div className="border-b border-neutral-200 pb-5">
              <p className="text-sm font-semibold text-[#111] mb-1">
                Disparate Impact Standard
              </p>
              <p className="text-[13px] text-neutral-500 leading-relaxed">
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
        <section className="mb-14">
          <p className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-6">
            Limitations
          </p>
          <div className="text-[13px] text-neutral-500 leading-relaxed space-y-4">
            <p>
              <strong className="text-[#111]">FLAIR is a statistical screening tool,
              not a regression analysis.</strong> It does not control for
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
