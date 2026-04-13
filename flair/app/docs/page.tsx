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
                name: "CFPB HMDA Data Browser API",
                desc: "Federal data reported by ~5,000 mortgage lenders under the Home Mortgage Disclosure Act (1975). Hosted by the CFPB at ffiec.cfpb.gov. Includes application outcomes, race/ethnicity, geography, loan type, and lender identity. Updated annually; 2018\u20132024 data available. Supports multi-year aggregation via comma-separated years parameter.",
              },
              {
                name: "U.S. Census ACS 5-Year Estimates",
                desc: "County-level demographic data from the American Community Survey (2022). Used to classify counties as majority-minority (>50% non-Hispanic non-White population) for geographic lending pattern analysis. Variables: B03002_001E (total population), B03002_003E (non-Hispanic White alone).",
              },
              {
                name: "Curated Enforcement Cases Database",
                desc: "Hand-curated TypeScript database of 32 federal and state fair lending enforcement actions (2011\u20132026) totaling approximately $1.2 billion in settlements. Sourced from DOJ press releases, CFPB enforcement action pages, and court filings. Each case includes the specific disparity metric cited in the complaint, structured numeric fields for machine comparison, legal theory, affected groups, geography, and source URL.",
              },
              {
                name: "Midpage",
                desc: "Legal research API providing keyword search across 13M+ federal and state court opinions. FLAIR uses the search endpoint to find cases by legal pattern (disparate impact, redlining) and the opinions endpoint to enrich results with citation count, treatment status, and judge metadata.",
              },
              {
                name: "TrustFoundry",
                desc: "Legal search API across 8M+ statutes, regulations, and cases. FLAIR uses the case_key_fact model type to search for cases by fact pattern \u2014 constructing a natural language description from the lender\u2019s computed disparity profile and finding cases with similar statistical circumstances.",
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
                desc: "Applications denied / (applications denied + applications originated) for each racial/ethnic group. Only HMDA action codes 1 (originated) and 3 (denied) are included. Withdrawn, incomplete, and purchased applications are excluded.",
              },
              {
                name: "Disparity Ratio",
                desc: "Denial rate for a racial group divided by the denial rate for White applicants. A ratio of 2.0x means the group is denied at twice the rate. White is used as the baseline group, mirroring DOJ and CFPB methodology where the comparison group is non-Hispanic White borrowers.",
              },
              {
                name: "95% Confidence Interval (Log-Ratio Delta Method)",
                desc: "Each disparity ratio is reported with a 95% confidence interval computed via the log-ratio delta method (Katz et al. 1978). The interval captures sampling uncertainty: a ratio of 2.1x with a 95% CI of [1.8x–2.4x] means we can be 95% confident the true ratio lies in that range. Ratios whose CI excludes 1.0x are statistically distinguishable from parity.",
              },
              {
                name: "Chi-Square Test of Independence (Yates-Corrected)",
                desc: "Each racial group comparison uses a Yates continuity-corrected chi-square test with 1 degree of freedom. H\u2080: denial rate is independent of race. A p-value below 0.05 indicates the disparity is unlikely due to chance at the 5% significance level. Groups with expected cell counts below 5 are flagged (chi-square approximation is unreliable for small cells).",
              },
              {
                name: "Cochran-Mantel-Haenszel (CMH) Stratified Test",
                desc: "The CMH test (Mantel & Haenszel 1959) pools the racial association across multiple strata (loan type strata, income band strata) and produces a single chi-square statistic with 1 df under H\u2080: no partial association in any stratum. A significant CMH result means the racial disparity persists after conditioning on the strata variable \u2014 it cannot be explained by composition differences in loan type or income. The Mantel-Haenszel common odds-ratio is reported as a controlled effect size. Strata with expected cell counts below 5 are excluded from the pool per Cochran (1954).",
              },
              {
                name: "Stratified Disparity Analysis (Controls Tab)",
                desc: "Disparity ratios are computed separately within each loan type (Conventional, FHA, VA, USDA) and each loan purpose (Purchase vs. Refinance). Conventional purchase loans are the legally strongest stratum because they carry no government guarantee and leave the most underwriting discretion with the lender. Disparities that persist within a stratum cannot be attributed to loan-type composition. Income band stratification (when available) further controls for applicant income reported in HMDA.",
              },
              {
                name: "Peer Comparison",
                desc: "Compares the lender\u2019s disparity ratios against the aggregate of all lenders in the same geography (statewide or MSA-level). When an MSA is selected, the comparison narrows to that metro area \u2014 matching the methodology DOJ uses to define peer lenders. The delta between lender and market ratios identifies outliers.",
              },
              {
                name: "Geographic Analysis",
                desc: "Counties are classified as majority-minority or majority-White using Census ACS data. The lender\u2019s share of applications in majority-minority counties is compared to the market average. A gap of 5+ percentage points below market may indicate potential redlining. This mirrors the methodology cited in DOJ Combating Redlining Initiative complaints (e.g., DOJ v. City National Bank, 2024).",
              },
              {
                name: "Trend Analysis",
                desc: "Disparity ratios computed for 2020\u20132024 show whether disparities are persistent, improving, or worsening. Persistent multi-year disparities strengthen the evidentiary basis for fair lending claims \u2014 they distinguish a pattern or practice from statistical noise.",
              },
              {
                name: "Minimum Detectable Ratio (Power Analysis)",
                desc: "Given the number of applications per racial group and the White denial rate, FLAIR computes the smallest disparity ratio detectable at 80% power and 95% two-sided confidence (two-proportion z-test). If the minimum detectable ratio (MDR) is above 1.5x, the sample is underpowered: a non-significant result does not mean discrimination is absent \u2014 it means the sample is too small to detect it. Courts distinguish \u201cdisparity not detected\u201d (a finding) from \u201csample too small to detect disparity\u201d (a limitation).",
              },
              {
                name: "Data Quality Disclosure (Controls Tab)",
                desc: "The Controls tab discloses: (1) loan type distribution by race \u2014 if FHA usage differs by \u226520 percentage points between racial groups, raw denial rates conflate loan-type composition with race, and a warning is shown; (2) application attrition rates (withdrawn + incomplete) by race \u2014 higher attrition for minority groups may indicate lender discouragement; (3) occupancy type distribution by race \u2014 investment property loans face higher denial rates and can confound comparisons.",
              },
            ].map((method) => (
              <div key={method.name} className="border-b border-neutral-200 pb-5">
                <p className="text-sm font-semibold text-[#111] mb-1">{method.name}</p>
                <p className="text-[13px] text-neutral-500 leading-relaxed">{method.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Evidence Standards */}
        <section className="mb-14">
          <p className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-6">
            Evidence Standards
          </p>
          <div className="space-y-6">
            <div className="border-b border-neutral-200 pb-5">
              <p className="text-sm font-semibold text-[#111] mb-1">
                30-Application Minimum Threshold
              </p>
              <p className="text-[13px] text-neutral-500 leading-relaxed">
                Groups with fewer than 30 applications are excluded from
                disparity ratio calculations. This is standard regulatory
                practice for statistical reliability. Groups below the
                threshold can still be toggled on in the denial rate chart
                via checkboxes, but are flagged with a low-sample warning.
                In stratified analysis (Controls tab), strata with expected
                cell counts below 5 are excluded from CMH pools per standard
                practice (Cochran 1954).
              </p>
            </div>
            <div className="border-b border-neutral-200 pb-5">
              <p className="text-sm font-semibold text-[#111] mb-1">
                Statistical Significance and Confidence Intervals
              </p>
              <p className="text-[13px] text-neutral-500 leading-relaxed">
                DOJ does not cite a fixed threshold for actionable disparities.
                Enforcement actions use &ldquo;statistically significant&rdquo;
                combined with practical magnitude. FLAIR flags ratios above 1.5x
                as warranting investigation. Each ratio is tested with a
                Yates-corrected chi-square test (p&lt;0.05 = significant) and
                reported with a 95% confidence interval via the log-ratio delta
                method. A ratio of 2.1x with a 95% CI of [1.7x–2.6x] means we
                can be 95% confident the true ratio lies in that range; its
                lower bound of 1.7x well exceeds the 1.5x investigation threshold.
                For CMH tests across strata, the same chi-square (1 df) criterion
                applies after pooling.
              </p>
            </div>
            <div className="border-b border-neutral-200 pb-5">
              <p className="text-sm font-semibold text-[#111] mb-1">
                Four-Fifths (80%) Rule
              </p>
              <p className="text-[13px] text-neutral-500 leading-relaxed">
                The Uniform Guidelines on Employee Selection Procedures
                (29 C.F.R. &sect; 1607.4) establish a &ldquo;four-fifths&rdquo;
                rule as a screening guideline: if a protected group&apos;s
                selection rate is less than 80% of the majority group&apos;s
                rate, adverse impact may be inferred. While developed for
                employment, this framework is referenced in lending
                discrimination analysis as a screening benchmark — not a
                legal definition.
              </p>
            </div>
            <div className="border-b border-neutral-200 pb-5">
              <p className="text-sm font-semibold text-[#111] mb-1">
                Racial/Ethnic Categories
              </p>
              <p className="text-[13px] text-neutral-500 leading-relaxed">
                FLAIR uses the racial and ethnic categories defined by OMB
                Statistical Policy Directive No. 15, as reported by lenders
                under HMDA. These are the same categories used in DOJ
                complaints, CFPB reports, and federal court filings.
              </p>
            </div>
          </div>
        </section>

        {/* Legal Framework — expanded */}
        <section className="mb-14">
          <p className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-6">
            Legal Framework
          </p>
          <div className="space-y-6">
            <div className="border-b border-neutral-200 pb-5">
              <p className="text-sm font-semibold text-[#111] mb-1">
                Redlining (FHA &sect; 3604)
              </p>
              <p className="text-[13px] text-neutral-500 leading-relaxed">
                Geographic avoidance of majority-minority communities in
                lending activity. Proved via comparison of the lender&apos;s
                geographic lending distribution to peer lenders in the same
                market — the methodology established by the DOJ Combating
                Redlining Initiative (launched October 2021). Four of the
                last five DOJ fair lending settlements are redlining cases.
              </p>
            </div>
            <div className="border-b border-neutral-200 pb-5">
              <p className="text-sm font-semibold text-[#111] mb-1">
                Disparate Impact (FHA &sect; 3605)
              </p>
              <p className="text-[13px] text-neutral-500 leading-relaxed">
                Under <em>Texas Dep&apos;t of Housing v. Inclusive
                Communities Project</em> (576 U.S. 519, 2015), the Supreme
                Court confirmed a three-step burden-shifting test:
                (1) plaintiff establishes prima facie case via statistical
                evidence of disparity caused by a specific policy;
                (2) defendant shows legitimate business justification;
                (3) plaintiff demonstrates a less discriminatory alternative
                serving the same purpose. This theory originated in{" "}
                <em>Griggs v. Duke Power</em> (401 U.S. 424, 1971) in the
                employment context and extends to lending.
              </p>
            </div>
            <div className="border-b border-neutral-200 pb-5">
              <p className="text-sm font-semibold text-[#111] mb-1">
                Pricing Discrimination / Steering (ECOA &sect; 1691)
              </p>
              <p className="text-[13px] text-neutral-500 leading-relaxed">
                Minority borrowers charged higher rates or steered into
                costlier products than similarly situated White borrowers.
                Evidence requires regression analysis on internal loan
                files — comparing pricing after controlling for credit score,
                LTV, DTI, loan purpose, and property type. This data is
                obtained through Civil Investigative Demands (government
                plaintiffs) or FRCP Rules 26/34 discovery (private
                plaintiffs). Landmark cases:{" "}
                <em>DOJ v. Countrywide</em> ($335M) and{" "}
                <em>DOJ v. Wells Fargo</em> ($175M).
              </p>
            </div>
            <div className="border-b border-neutral-200 pb-5">
              <p className="text-sm font-semibold text-[#111] mb-1">
                Reverse Redlining (FHA &sect; 3604)
              </p>
              <p className="text-[13px] text-neutral-500 leading-relaxed">
                The inverse of redlining: instead of avoiding minority
                neighborhoods, the lender targets them with predatory
                products — higher rates, unnecessary fees, balloon payments,
                prepayment penalties. Evidence includes geographic analysis
                showing disproportionate volumes of high-cost loans in
                minority neighborhoods, paired with marketing materials
                showing intentional targeting.
              </p>
            </div>
          </div>
        </section>

        {/* Limitations — strengthened */}
        <section className="mb-14">
          <p className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-6">
            Limitations
          </p>
          <div className="text-[13px] text-neutral-500 leading-relaxed space-y-4">
            <p>
              <strong className="text-[#111]">FLAIR controls for observable HMDA variables
              (loan type, loan purpose, income band, occupancy type) but not for unobservable
              creditworthiness factors.</strong> Credit score, exact debt-to-income ratio, and
              loan-to-value ratio are not available in public HMDA data. They require
              litigation discovery (FRCP Rules 26/34) or government subpoenas (Civil
              Investigative Demands). This is a sequencing limitation, not a fundamental
              one: plaintiffs obtain this data after filing, not before.
            </p>
            <p>
              The Controls tab applies Cochran-Mantel-Haenszel stratified tests across
              loan-type strata and (where the HMDA API supports income range queries)
              income-band strata. These are partial controls available pre-litigation.
              A significant CMH result after controlling for loan type means the disparity
              cannot be fully attributed to the FHA/conventional composition difference.
            </p>
            <p>
              The 1994 Interagency Policy Statement on Discrimination in
              Lending explicitly recognized that statistical evidence of
              disparate impact is a legitimate evidentiary method even before
              controlling for creditworthiness. The screening step is valid
              on its own terms — it identifies which lenders to investigate,
              not which to convict.
            </p>
            <p>
              Disparity ratios identify where disparities exist, not why they
              exist. A qualified expert witness and regression analysis are
              required for litigation. FLAIR replaces the $15,000–$50,000
              screening engagement that decides whether to hire one.
            </p>
            <p>
              <strong className="text-[#111]">Power and sample size.</strong> Small lenders
              or small racial minority groups may have insufficient applications to detect
              moderate disparities at conventional significance thresholds. The Minimum
              Detectable Ratio (MDR) shown in the Controls tab quantifies this: if the MDR
              exceeds 1.5x, the sample is underpowered to detect a moderate disparity even
              if one exists. Pooling multiple years (supported in the Peers &amp; Trends tab)
              increases statistical power.
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
