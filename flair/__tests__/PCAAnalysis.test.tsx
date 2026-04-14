/**
 * Component render tests for components/PCAAnalysis.tsx
 *
 * Covers:
 *  - Loading state (spinner shown)
 *  - Error state (fetch returns error JSON)
 *  - Network error state (fetch throws)
 *  - Happy path with PCA data (scree plot heading, biplot, heatmap)
 *  - Happy path with KBO data (group names appear)
 *  - No-PCA state (< 3 groups message shown)
 *  - No-KBO state (no gap message shown)
 *  - PCA + KBO present: legal interpretation section rendered
 *  - Props wiring: lei / state / msa / years used in fetch URL
 */

import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import PCAAnalysis from "@/components/PCAAnalysis";
import type { VarianceDecompositionResult } from "@/lib/variance-decomposition";

// ─── Mock recharts (no SVG in jsdom) ─────────────────────────────────────────

jest.mock("recharts", () => {
  const actual = jest.requireActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  };
});

// ─── Mock global fetch ────────────────────────────────────────────────────────

const mockFetch = jest.fn();
const originalFetch = global.fetch;

beforeAll(() => {
  Object.defineProperty(global, "fetch", {
    writable: true,
    value: mockFetch,
  });
});

afterAll(() => {
  Object.defineProperty(global, "fetch", {
    writable: true,
    value: originalFetch,
  });
});

// ─── Fixture: full VarianceDecompositionResult ────────────────────────────────

const FULL_RESULT: VarianceDecompositionResult = {
  pca: {
    scores: [
      [1.2, -0.3],
      [-0.8, 0.5],
      [0.1, 0.9],
      [-0.5, -1.1],
    ],
    loadings: [
      [0.7, 0.1],
      [-0.5, 0.6],
      [0.3, -0.7],
      [0.2, 0.3],
    ],
    varianceExplained: [0.65, 0.25],
    cumulativeVariance: [0.65, 0.90],
    eigenvalues: [2.6, 1.0],
    meanVector: [0.1, 0.2, 0.3, 0.4],
    stdVector: [1, 1, 1, 1],
    featureNames: ["denial_rate", "share_conventional", "share_fha", "log_applications"],
    observationLabels: ["White", "African American", "Asian", "Hispanic/Latino"],
    nComponents: 2,
  },
  featureMatrix: {
    groups: ["White", "African American", "Asian", "Hispanic/Latino"],
    features: ["denial_rate", "share_conventional", "share_fha", "log_applications"],
    data: [
      [0.10, 0.75, 0.25, 4.5],
      [0.30, 0.50, 0.50, 4.3],
      [0.18, 0.70, 0.30, 4.4],
      [0.25, 0.55, 0.45, 4.2],
    ],
  },
  kbo: [
    {
      group: "Black or African American",
      label: "African American",
      rawDenialRate: 0.30,
      whiteDenialRate: 0.10,
      rawGap: 0.20,
      compositionEffect: 0.05,
      treatmentEffect: 0.12,
      interactionEffect: 0.03,
      compositionFraction: 0.25,
      treatmentFraction: 0.60,
      strataUsed: 2,
      byStratum: [
        {
          label: "Conventional",
          compositionContribution: 0.02,
          treatmentContribution: 0.08,
          interactionContribution: 0.01,
          shareGroup: 0.50,
          shareWhite: 0.75,
          denialRateGroup: 0.28,
          denialRateWhite: 0.10,
        },
        {
          label: "FHA",
          compositionContribution: 0.03,
          treatmentContribution: 0.04,
          interactionContribution: 0.02,
          shareGroup: 0.50,
          shareWhite: 0.25,
          denialRateGroup: 0.35,
          denialRateWhite: 0.15,
        },
      ],
    },
    {
      group: "Asian",
      label: "Asian",
      rawDenialRate: 0.18,
      whiteDenialRate: 0.10,
      rawGap: 0.08,
      compositionEffect: 0.02,
      treatmentEffect: 0.05,
      interactionEffect: 0.01,
      compositionFraction: 0.25,
      treatmentFraction: 0.625,
      strataUsed: 2,
      byStratum: [
        {
          label: "Conventional",
          compositionContribution: 0.01,
          treatmentContribution: 0.03,
          interactionContribution: 0.005,
          shareGroup: 0.70,
          shareWhite: 0.75,
          denialRateGroup: 0.20,
          denialRateWhite: 0.10,
        },
      ],
    },
  ],
  aggregateCompositionFraction: 0.25,
  aggregateTreatmentFraction: 0.60,
  pc1TopFeatures: [
    { feature: "denial_rate", loading: 0.7 },
    { feature: "share_conventional", loading: -0.5 },
  ],
  pc2TopFeatures: [
    { feature: "share_fha", loading: -0.7 },
    { feature: "share_conventional", loading: 0.6 },
  ],
  kboStrata: ["Conventional", "FHA", "VA", "USDA"],
};

/** A result with no PCA (< 3 groups) but with KBO */
const NO_PCA_RESULT: VarianceDecompositionResult = {
  ...FULL_RESULT,
  pca: null,
};

/** A result with PCA but no meaningful gap */
const NO_GAP_RESULT: VarianceDecompositionResult = {
  ...FULL_RESULT,
  kbo: [
    {
      ...FULL_RESULT.kbo[0],
      rawGap: 0.0,     // no gap
      rawDenialRate: 0.10,
    },
    {
      ...FULL_RESULT.kbo[1],
      rawGap: 0.0,
      rawDenialRate: 0.10,
    },
  ],
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function mockFetchOk(data: unknown) {
  mockFetch.mockResolvedValueOnce({
    json: () => Promise.resolve(data),
    ok: true,
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

// ─── Tests: loading state ─────────────────────────────────────────────────────

describe("PCAAnalysis – loading state", () => {
  test("shows spinner while loading", () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves
    render(<PCAAnalysis lei="TESTLEI" state="CA" years="2023" />);
    expect(
      screen.getByText(/Running variance decomposition/i)
    ).toBeInTheDocument();
  });

  test("does not call fetch when lei is empty string", () => {
    // useEffect guard: if (!lei) return
    render(<PCAAnalysis lei="" state="CA" years="2023" />);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ─── Tests: error state ───────────────────────────────────────────────────────

describe("PCAAnalysis – error states", () => {
  test("shows error when API returns { error: '...' }", async () => {
    mockFetchOk({ error: "Database unavailable" });
    render(<PCAAnalysis lei="LEI" state="CA" years="2023" />);
    await waitFor(() =>
      expect(screen.getByText(/Database unavailable/i)).toBeInTheDocument()
    );
    expect(screen.getByText(/Variance analysis error/i)).toBeInTheDocument();
  });

  test("shows error when fetch throws (network failure)", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    render(<PCAAnalysis lei="LEI" state="CA" years="2023" />);
    await waitFor(() =>
      expect(screen.getByText(/Variance analysis error/i)).toBeInTheDocument()
    );
  });
});

// ─── Tests: happy path – full result ─────────────────────────────────────────

describe("PCAAnalysis – full result rendering", () => {
  beforeEach(async () => {
    mockFetchOk(FULL_RESULT);
    await act(async () => {
      render(<PCAAnalysis lei="LEI" state="CA" years="2023" />);
    });
    await waitFor(() =>
      expect(
        screen.queryByText(/Running variance decomposition/i)
      ).not.toBeInTheDocument()
    );
  });

  test("renders variance decomposition heading", () => {
    expect(
      screen.getByText(/Variance Decomposition/i)
    ).toBeInTheDocument();
  });

  test("renders scree plot heading", () => {
    expect(
      screen.getByText(/Variance Explained per Principal Component/i)
    ).toBeInTheDocument();
  });

  test("renders biplot heading", () => {
    expect(screen.getByText(/Racial Groups in Principal Component Space/i)).toBeInTheDocument();
  });

  test("renders loading heatmap heading", () => {
    expect(screen.getByText(/Feature Loadings on Principal Components/i)).toBeInTheDocument();
  });

  test("renders KBO section heading", () => {
    expect(
      screen.getByText(/Kitagawa-Blinder-Oaxaca Decomposition/i)
    ).toBeInTheDocument();
  });

  test("renders minority group labels in KBO table", () => {
    expect(screen.getAllByText("African American").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Asian").length).toBeGreaterThan(0);
  });

  test("renders legal interpretation section", () => {
    expect(
      screen.getByText(/Statistical Interpretation for Legal Counsel/i)
    ).toBeInTheDocument();
  });

  test("renders methodology note", () => {
    expect(screen.getByText(/Methodology/i)).toBeInTheDocument();
  });

  test("renders KBO stratum text in methodology (conventional, FHA)", () => {
    // This text appears in the methodology section at the bottom
    const allMatches = screen.getAllByText(/conventional, FHA, VA, USDA/i);
    expect(allMatches.length).toBeGreaterThan(0);
  });
});

// ─── Tests: no-PCA state ──────────────────────────────────────────────────────

describe("PCAAnalysis – no PCA (< 3 groups)", () => {
  test("shows insufficient-data message when pca is null", async () => {
    mockFetchOk(NO_PCA_RESULT);
    render(<PCAAnalysis lei="LEI" state="TX" years="2023" />);
    await waitFor(() =>
      expect(
        screen.getByText(/PCA requires at least 3 racial groups/i)
      ).toBeInTheDocument()
    );
  });
});

// ─── Tests: no-KBO state ──────────────────────────────────────────────────────

describe("PCAAnalysis – no meaningful gap", () => {
  test("shows no-gap message when all rawGap ≈ 0", async () => {
    mockFetchOk(NO_GAP_RESULT);
    render(<PCAAnalysis lei="LEI" state="TX" years="2023" />);
    await waitFor(() =>
      expect(
        screen.getByText(/No significant denial-rate gap/i)
      ).toBeInTheDocument()
    );
  });
});

// ─── Tests: URL construction ──────────────────────────────────────────────────

describe("PCAAnalysis – fetch URL construction", () => {
  test("uses state= when state is provided and msa is not", async () => {
    mockFetchOk(FULL_RESULT);
    render(<PCAAnalysis lei="MYLEI" state="NY" years="2022" />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("lei=MYLEI");
    expect(calledUrl).toContain("state=NY");
    expect(calledUrl).toContain("years=2022");
  });

  test("uses msa= when msa is provided", async () => {
    mockFetchOk(FULL_RESULT);
    render(<PCAAnalysis lei="MYLEI" msa="35620" years="2023" />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("msa=35620");
    expect(calledUrl).not.toContain("state=");
  });

  test("hits /api/pca endpoint", async () => {
    mockFetchOk(FULL_RESULT);
    render(<PCAAnalysis lei="LEI" state="FL" years="2023" />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/api/pca");
  });
});

// ─── Tests: re-fetch on prop change ──────────────────────────────────────────

describe("PCAAnalysis – re-fetch when props change", () => {
  test("re-fetches when lei changes", async () => {
    mockFetch.mockResolvedValue({ json: () => Promise.resolve(FULL_RESULT), ok: true });

    const { rerender } = render(<PCAAnalysis lei="LEI1" state="CA" years="2023" />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    rerender(<PCAAnalysis lei="LEI2" state="CA" years="2023" />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));

    const call2 = mockFetch.mock.calls[1][0] as string;
    expect(call2).toContain("lei=LEI2");
  });
});
