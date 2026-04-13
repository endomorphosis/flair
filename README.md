# FLAIR — Fair Lending AI Radar

**Turn federal mortgage data into fair lending evidence — in seconds.**

[try-flair.vercel.app](https://try-flair.vercel.app)

Built for [LLM x Law Hackathon #6](https://lu.ma/llmlaw6) at Stanford CodeX.

---

## What it does

FLAIR is a screening tool that lets anyone search a mortgage lender by name and instantly see:

- **Denial rate disparities** by race and ethnicity, with disparity ratios vs. White applicants
- **Peer comparison** against all lenders in the same state or metro area (MSA)
- **Geographic lending patterns** — detects potential redlining by comparing application share in majority-minority vs. majority-White counties
- **Multi-year trends** showing whether disparities are persistent, improving, or worsening
- **Legal analysis** — maps statistical findings to ECOA/FHA causes of action, with an enforcement benchmark against 33 real DOJ/CFPB settlements totaling $1.2B+

Supports single-year or multi-year range analysis (e.g., 2021-2024).

## Why it exists

Every year, ~5,000 mortgage lenders report loan-level data to the federal government under the Home Mortgage Disclosure Act (HMDA). Hundreds have statistically significant racial disparities in their denial rates. But only the DOJ and CFPB had the analytical tools to systematically screen for them — and enforcement has fallen sharply since Executive Order 14281 deprioritized disparate impact cases in February 2025.

FLAIR fills this gap by democratizing the same HMDA analysis federal regulators use, putting screening power in the hands of legal aid attorneys and civil rights organizations.

Inspired by the California Racial Justice Act and the [RJA Tool](https://paperprisons.org) built by the Paper Prisons Initiative at Stanford, which uses statistical analysis of criminal sentencing data to surface racial disparities and support motions for resentencing.

## Tech stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **Data sources**:
  - [CFPB HMDA Data Browser API](https://ffiec.cfpb.gov) — mortgage lending data
  - [U.S. Census ACS API](https://api.census.gov) — county demographics
  - [Midpage](https://midpage.ai) — case law search (13M+ court opinions)
  - [TrustFoundry](https://trustfoundry.ai) — fact-pattern case matching
- **Deployment**: Vercel

## Running locally

```bash
cd flair
npm install
npm run dev
```

Create `flair/.env.local` with:

```
MIDPAGE_API_KEY=your_key
TRUSTFOUNDRY_API_KEY=your_key
```

The HMDA and Census APIs require no authentication.

## Project structure

```
flair/
  app/
    page.tsx              # Search page
    about/page.tsx        # Problem statement + enforcement context
    docs/page.tsx         # Methodology + data sources + limitations
    results/page.tsx      # Tabbed results (Disparity, Peers, Geography, Legal)
    api/
      lenders/            # LEI resolution
      disparity/          # Denial rate disparities by race
      peers/              # Market-wide aggregate for peer comparison
      trends/             # Multi-year trend data
      geographic/         # County-level geographic analysis
      midpage/            # Case law search
      trustfoundry/       # Fact-pattern case matching
  components/
    SearchForm.tsx        # Lender search with state/MSA/year range
    DisparityProfile.tsx  # Headline disparity ratio + enforcement precedent
    DenialRateChart.tsx   # Bar chart with checkbox filters
    PeerComparison.tsx    # Lender vs. market table
    TrendChart.tsx        # Multi-year line chart
    GeographicAnalysis.tsx # Redlining detection
    LegalAnalysis.tsx     # Evidence assessment + causes of action + benchmark
  lib/
    hmda.ts               # HMDA API client
    computations.ts       # Denial rate + disparity ratio computation
    census.ts             # Census ACS county demographics
    enforcement-cases.ts  # 33 curated DOJ/CFPB enforcement cases
    constants.ts          # Race categories, state codes, MSA codes
```

## Methodology

- **Denial rate** = applications denied / (denied + originated) per racial group
- **Disparity ratio** = group denial rate / White denial rate
- **Peer comparison** = lender ratio vs. statewide or MSA aggregate
- **Geographic analysis** = % of applications in majority-minority counties (>50% non-White per Census ACS) vs. market average
- **Minimum sample**: groups with <30 applications excluded from ratios, flagged in chart

This is a statistical screening tool. It does not control for creditworthiness (credit score, DTI, LTV) — those require litigation discovery. See the [Docs page](https://try-flair.vercel.app/docs) for full methodology and limitations.

## License

MIT
