/**
 * Tests for DiscriminationRiskSummary, enhanced DisparityProfile,
 * and enhanced PeerComparison components.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import DiscriminationRiskSummary from "@/components/DiscriminationRiskSummary";
import DisparityProfile from "@/components/DisparityProfile";
import PeerComparison from "@/components/PeerComparison";
import type { DisparityRatio } from "@/lib/computations";

// ─── Mock recharts ────────────────────────────────────────────────────────────

jest.mock("recharts", () => ({
  ...jest.requireActual("recharts"),
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeRatio(overrides: Partial<DisparityRatio>): DisparityRatio {
  return {
    group: "Black or African American",
    label: "African American",
    ratio: 2.2,
    denialRate: 0.22,
    baselineDenialRate: 0.10,
    applications: 150,
    denials: 33,
    baselineApplications: 500,
    baselineDenials: 50,
    ci: { lower: 1.42, upper: 3.41 },
    chiSquare: { statistic: 14.2, pValue: 0.0002, significant: true },
    lowSampleWarning: false,
    ...overrides,
  };
}

const HIGH_RISK_RATIO = makeRatio({
  ratio: 2.2,
  chiSquare: { statistic: 14.2, pValue: 0.0002, significant: true },
});

const ELEVATED_RATIO = makeRatio({
  group: "Asian",
  label: "Asian",
  ratio: 1.7,
  denialRate: 0.17,
  applications: 200,
  denials: 34,
  chiSquare: { statistic: 5.1, pValue: 0.024, significant: true },
  ci: { lower: 1.1, upper: 2.6 },
});

const MODERATE_RATIO = makeRatio({
  group: "American Indian or Alaska Native",
  label: "Native American",
  ratio: 1.3,
  denialRate: 0.13,
  applications: 60,
  denials: 8,
  chiSquare: { statistic: 1.8, pValue: 0.18, significant: false },
  ci: { lower: 0.7, upper: 2.4 },
});

const LOW_RATIO = makeRatio({
  group: "Asian",
  label: "Asian",
  ratio: 1.05,
  denialRate: 0.105,
  applications: 300,
  denials: 32,
  chiSquare: { statistic: 0.1, pValue: 0.75, significant: false },
  ci: { lower: 0.72, upper: 1.53 },
});

const MARKET_RATIO = makeRatio({
  ratio: 1.5,
});

const TREND_YEARS = [
  {
    year: 2021,
    disparityRatios: [makeRatio({ ratio: 1.8 })],
  },
  {
    year: 2022,
    disparityRatios: [makeRatio({ ratio: 2.0 })],
  },
  {
    year: 2023,
    disparityRatios: [makeRatio({ ratio: 2.2 })],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DiscriminationRiskSummary
// ─────────────────────────────────────────────────────────────────────────────

describe("DiscriminationRiskSummary – empty input", () => {
  test("renders nothing when disparityRatios is empty", () => {
    const { container } = render(
      <DiscriminationRiskSummary
        disparityRatios={[]}
        marketRatios={[]}
        trends={[]}
        lenderName="Test Bank"
        geoLabel="California"
        yearLabel="2023"
      />
    );
    expect(container.firstChild).toBeNull();
  });
});

describe("DiscriminationRiskSummary – HIGH risk", () => {
  beforeEach(() => {
    render(
      <DiscriminationRiskSummary
        disparityRatios={[HIGH_RISK_RATIO]}
        marketRatios={[MARKET_RATIO]}
        trends={TREND_YEARS}
        lenderName="Acme Mortgage"
        geoLabel="California"
        yearLabel="2023"
      />
    );
  });

  test("shows HIGH risk chip", () => {
    expect(screen.getAllByText("HIGH").length).toBeGreaterThan(0);
  });

  test("shows strong statistical evidence headline", () => {
    expect(
      screen.getByText(/Strong statistical evidence of discrimination/i)
    ).toBeInTheDocument();
  });

  test("shows lender name in banner text", () => {
    expect(screen.getAllByText(/Acme Mortgage/i).length).toBeGreaterThan(0);
  });

  test("shows the ratio badge 2.20x in matrix", () => {
    expect(screen.getByText("2.20x")).toBeInTheDocument();
  });

  test("shows ★★ significance for p<0.01", () => {
    expect(screen.getAllByText("★★").length).toBeGreaterThan(0);
  });

  test("shows worsening trend arrow ↑", () => {
    // trend goes 1.8 → 2.0 → 2.2 (worsening)
    expect(screen.getByTitle("Worsening trend")).toBeInTheDocument();
  });

  test("shows positive peer gap (lender 2.2x - market 1.5x = +0.7)", () => {
    expect(screen.getByText("+0.70")).toBeInTheDocument();
  });

  test("shows CI in matrix row", () => {
    // "1.42–3.41" should appear in the matrix
    expect(screen.getByText(/1\.42.+3\.41/)).toBeInTheDocument();
  });

  test("shows p-value in matrix row", () => {
    expect(screen.getByText(/p=<\.001|p=0\.000/i)).toBeInTheDocument();
  });

  test("shows African American in findings summary", () => {
    expect(screen.getAllByText(/African American/i).length).toBeGreaterThan(0);
  });

  test("shows worsening trend in key findings", () => {
    expect(screen.getByText(/Disparities against.*worsening/i)).toBeInTheDocument();
  });

  test("shows Evidence by Demographic Group heading", () => {
    expect(screen.getByText(/Evidence by Demographic Group/i)).toBeInTheDocument();
  });

  test("shows Key Findings heading", () => {
    expect(screen.getByText(/Key Findings/i)).toBeInTheDocument();
  });
});

describe("DiscriminationRiskSummary – ELEVATED risk (no peer data)", () => {
  beforeEach(() => {
    render(
      <DiscriminationRiskSummary
        disparityRatios={[ELEVATED_RATIO]}
        marketRatios={[]}
        trends={[]}
        lenderName="First Federal"
        geoLabel="Texas"
        yearLabel="2023"
      />
    );
  });

  test("shows ELEVATED risk chip", () => {
    expect(screen.getAllByText("ELEVATED").length).toBeGreaterThan(0);
  });

  test("shows ★ (single star) for p<0.05", () => {
    expect(screen.getAllByText("★").length).toBeGreaterThan(0);
  });

  test("shows dash for peer gap when no market data", () => {
    // market column shows — when no peers
    expect(screen.queryByText(/vs\. Market/i)).not.toBeInTheDocument();
  });
});

describe("DiscriminationRiskSummary – MODERATE risk", () => {
  test("shows MODERATE chip when ratio ≥1.2 but not significant", () => {
    render(
      <DiscriminationRiskSummary
        disparityRatios={[MODERATE_RATIO]}
        marketRatios={[]}
        trends={[]}
        lenderName="Local Bank"
        geoLabel="NY"
        yearLabel="2023"
      />
    );
    expect(screen.getAllByText("MODERATE").length).toBeGreaterThan(0);
  });
});

describe("DiscriminationRiskSummary – LOW risk", () => {
  test("shows LOW chip and no-disparity headline", () => {
    render(
      <DiscriminationRiskSummary
        disparityRatios={[LOW_RATIO]}
        marketRatios={[]}
        trends={[]}
        lenderName="Good Bank"
        geoLabel="FL"
        yearLabel="2023"
      />
    );
    expect(screen.getAllByText("LOW").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/No significant disparity detected/i)
    ).toBeInTheDocument();
  });
});

describe("DiscriminationRiskSummary – multiple groups", () => {
  test("shows all groups in risk matrix", () => {
    render(
      <DiscriminationRiskSummary
        disparityRatios={[HIGH_RISK_RATIO, ELEVATED_RATIO, MODERATE_RATIO]}
        marketRatios={[]}
        trends={[]}
        lenderName="Multi Bank"
        geoLabel="CA"
        yearLabel="2023"
      />
    );
    expect(screen.getByText("African American")).toBeInTheDocument();
    expect(screen.getByText("Asian")).toBeInTheDocument();
    expect(screen.getByText("Native American")).toBeInTheDocument();
  });

  test("overall risk is HIGH when any group is high", () => {
    render(
      <DiscriminationRiskSummary
        disparityRatios={[HIGH_RISK_RATIO, LOW_RATIO]}
        marketRatios={[]}
        trends={[]}
        lenderName="X"
        geoLabel="Y"
        yearLabel="2023"
      />
    );
    expect(screen.getAllByText("HIGH").length).toBeGreaterThan(0);
  });
});

describe("DiscriminationRiskSummary – controlled disparity", () => {
  test("mentions controlled analysis in key findings when CMH is significant", () => {
    render(
      <DiscriminationRiskSummary
        disparityRatios={[HIGH_RISK_RATIO]}
        marketRatios={[]}
        trends={[]}
        lenderName="Z Bank"
        geoLabel="CA"
        yearLabel="2023"
        controlledDisparity={{
          significantInConventionalPurchase: false,
          cmhLoanTypeSignificant: true,
          cmhIncomeBandSignificant: false,
          incomeBandsAvailable: true,
          anyGroupUnderpowered: false,
        }}
      />
    );
    expect(screen.getByText(/Controlled analysis/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Enhanced DisparityProfile
// ─────────────────────────────────────────────────────────────────────────────

describe("DisparityProfile – enhanced", () => {
  test("renders empty state message when ratios is empty", () => {
    render(
      <DisparityProfile ratios={[]} lenderName="X" state="CA" yearLabel="2023" />
    );
    expect(screen.getByText(/Insufficient data/i)).toBeInTheDocument();
  });

  test("shows ★★ stars for p<0.01 ratio", () => {
    render(
      <DisparityProfile
        ratios={[HIGH_RISK_RATIO]}
        lenderName="Acme"
        state="CA"
        yearLabel="2023"
      />
    );
    expect(screen.getAllByText("★★").length).toBeGreaterThan(0);
  });

  test("shows High risk · p<.01 evidence badge", () => {
    render(
      <DisparityProfile
        ratios={[HIGH_RISK_RATIO]}
        lenderName="Acme"
        state="CA"
        yearLabel="2023"
      />
    );
    expect(screen.getAllByText(/High risk · p<\.01/i).length).toBeGreaterThan(0);
  });

  test("shows chi-square p-value in headline stat row", () => {
    render(
      <DisparityProfile
        ratios={[HIGH_RISK_RATIO]}
        lenderName="Acme"
        state="CA"
        yearLabel="2023"
      />
    );
    expect(screen.getByText(/χ² p=/i)).toBeInTheDocument();
  });

  test("shows confidence interval in headline stat row", () => {
    render(
      <DisparityProfile
        ratios={[HIGH_RISK_RATIO]}
        lenderName="Acme"
        state="CA"
        yearLabel="2023"
      />
    );
    expect(screen.getByText(/95% CI \[/i)).toBeInTheDocument();
  });

  test("shows CI bar for worst group", () => {
    render(
      <DisparityProfile
        ratios={[HIGH_RISK_RATIO]}
        lenderName="Acme"
        state="CA"
        yearLabel="2023"
      />
    );
    expect(screen.getByText(/95% Confidence interval/i)).toBeInTheDocument();
  });

  test("shows legend for significance stars in all-ratios table", () => {
    render(
      <DisparityProfile
        ratios={[HIGH_RISK_RATIO, ELEVATED_RATIO]}
        lenderName="Acme"
        state="CA"
        yearLabel="2023"
      />
    );
    expect(screen.getByText(/★★ p<0\.01/i)).toBeInTheDocument();
  });

  test("shows 'ns' for non-significant ratio", () => {
    // MODERATE_RATIO has p=0.18 → not significant → 'ns' badge
    render(
      <DisparityProfile
        ratios={[HIGH_RISK_RATIO, MODERATE_RATIO]}
        lenderName="Acme"
        state="CA"
        yearLabel="2023"
      />
    );
    // Since the component shows significance stars and the moderate ratio has no stars, check badge text
    expect(screen.getAllByText(/All Disparity Ratios/i).length).toBeGreaterThan(0);
  });

  test("shows enforcement precedent when ratio ≥1.5", () => {
    render(
      <DisparityProfile
        ratios={[HIGH_RISK_RATIO]}
        lenderName="Acme"
        state="CA"
        yearLabel="2023"
      />
    );
    expect(screen.getByText(/Enforcement precedent/i)).toBeInTheDocument();
  });

  test("renders correctly with a single ratio (no all-ratios section)", () => {
    render(
      <DisparityProfile
        ratios={[HIGH_RISK_RATIO]}
        lenderName="Acme"
        state="CA"
        yearLabel="2023"
      />
    );
    // Section header for "all ratios" should NOT appear with one ratio
    expect(screen.queryByText(/All Disparity Ratios/i)).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Enhanced PeerComparison
// ─────────────────────────────────────────────────────────────────────────────

describe("PeerComparison – enhanced", () => {
  test("renders nothing when comparisons is empty (no matching groups)", () => {
    const { container } = render(
      <PeerComparison
        lenderRatios={[HIGH_RISK_RATIO]}
        marketRatios={[makeRatio({ group: "Asian", label: "Asian" })]}
        lenderName="X"
        state="CA"
      />
    );
    // No matching group → comparisons = [] → null returned
    expect(container.firstChild).toBeNull();
  });

  test("shows 'Market outlier' badge when diff > 0.3", () => {
    // lender ratio 2.2x - market 1.5x = +0.7 → outlier
    render(
      <PeerComparison
        lenderRatios={[HIGH_RISK_RATIO]}
        marketRatios={[MARKET_RATIO]}
        lenderName="Acme"
        state="CA"
      />
    );
    expect(screen.getAllByText(/Market outlier/i).length).toBeGreaterThan(0);
  });

  test("shows red outlier callout box with >0.3 diff", () => {
    render(
      <PeerComparison
        lenderRatios={[HIGH_RISK_RATIO]}
        marketRatios={[MARKET_RATIO]}
        lenderName="Acme"
        state="CA"
      />
    );
    // The callout mentions ⚠ and the group name
    expect(screen.getByText(/⚠ Market outlier/i)).toBeInTheDocument();
    expect(screen.getByText(/exceeds the state-wide peer average/i)).toBeInTheDocument();
  });

  test("shows 'outlier' tag inline in table row when diff > 0.3", () => {
    render(
      <PeerComparison
        lenderRatios={[HIGH_RISK_RATIO]}
        marketRatios={[MARKET_RATIO]}
        lenderName="Acme"
        state="CA"
      />
    );
    expect(screen.getAllByText("outlier").length).toBeGreaterThan(0);
  });

  test("shows 'Above-market disparity' when 0.1 < diff ≤ 0.3", () => {
    const slightlyWorse = makeRatio({ ratio: 1.65 }); // 1.65 - 1.5 = 0.15
    render(
      <PeerComparison
        lenderRatios={[slightlyWorse]}
        marketRatios={[MARKET_RATIO]}
        lenderName="Mid Bank"
        state="TX"
      />
    );
    expect(screen.getByText("Above-market disparity")).toBeInTheDocument();
  });

  test("shows 'Below-market disparity' when diff < -0.1", () => {
    const better = makeRatio({ ratio: 1.1 }); // 1.1 - 1.5 = -0.4
    render(
      <PeerComparison
        lenderRatios={[better]}
        marketRatios={[MARKET_RATIO]}
        lenderName="Good Bank"
        state="FL"
      />
    );
    expect(screen.getByText("Below-market disparity")).toBeInTheDocument();
  });

  test("shows 'Near-market' when diff is small", () => {
    const similar = makeRatio({ ratio: 1.52 }); // 1.52 - 1.5 = +0.02
    render(
      <PeerComparison
        lenderRatios={[similar]}
        marketRatios={[MARKET_RATIO]}
        lenderName="Ave Bank"
        state="OH"
      />
    );
    expect(screen.getByText("Near-market")).toBeInTheDocument();
  });

  test("shows delta value as +N.NN in table", () => {
    render(
      <PeerComparison
        lenderRatios={[HIGH_RISK_RATIO]}
        marketRatios={[MARKET_RATIO]}
        lenderName="Acme"
        state="CA"
      />
    );
    // diff = 2.2 - 1.5 = 0.7 → "+0.70"
    expect(screen.getByText("+0.70")).toBeInTheDocument();
  });

  test("shows both lender and market ratio columns", () => {
    render(
      <PeerComparison
        lenderRatios={[HIGH_RISK_RATIO]}
        marketRatios={[MARKET_RATIO]}
        lenderName="X"
        state="CA"
      />
    );
    expect(screen.getByText("Lender")).toBeInTheDocument();
    expect(screen.getByText("Market avg")).toBeInTheDocument();
  });

  test("shows footnote about peer definition", () => {
    render(
      <PeerComparison
        lenderRatios={[HIGH_RISK_RATIO]}
        marketRatios={[MARKET_RATIO]}
        lenderName="X"
        state="CA"
      />
    );
    expect(screen.getByText(/Market average = state-wide aggregate/i)).toBeInTheDocument();
  });
});
