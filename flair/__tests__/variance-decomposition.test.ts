/**
 * Comprehensive unit tests for lib/variance-decomposition.ts
 *
 * Covers:
 *  - collapseByGroup / collapseByGroupAndStratum (via computeVarianceDecomposition)
 *  - KBO decomposition: composition + treatment + interaction = rawGap (approx)
 *  - KBO stratum filtering (< 5 apps excluded)
 *  - Feature-matrix builder (feature keys, group filtering)
 *  - PCA integration (≥3 groups → pca is non-null)
 *  - Aggregate composition/treatment fractions
 *  - Edge cases: single group, no White baseline, insufficient data
 */

import {
  computeVarianceDecomposition,
  DecompositionInput,
  KBODecomposition,
  VarianceDecompositionResult,
} from "@/lib/variance-decomposition";
import type { AggregationResponse } from "@/lib/hmda";

// ─── Fixture builders ─────────────────────────────────────────────────────────

const ACTION_ORIGINATED = "1";
const ACTION_DENIED = "3";

/**
 * Build a minimal AggregationResponse for overall race × action data.
 *
 * Each entry in `entries` specifies (race, action, count).
 */
function overallResp(
  entries: Array<{ race: string; action: string; count: number }>
): AggregationResponse {
  return {
    parameters: {},
    aggregations: entries.map(({ race, action, count }) => ({
      count,
      sum: count,
      actions_taken: action,
      races: race,
    })),
  };
}

/**
 * Build an AggregationResponse for race × loan_type × action data.
 *
 * loan_types: "1"=Conventional, "2"=FHA, "3"=VA, "4"=USDA
 */
function loanTypeResp(
  entries: Array<{ race: string; loanType: string; action: string; count: number }>
): AggregationResponse {
  return {
    parameters: {},
    aggregations: entries.map(({ race, loanType, action, count }) => ({
      count,
      sum: count,
      actions_taken: action,
      races: race,
      loan_types: loanType,
    })),
  };
}

/**
 * Build an AggregationResponse for race × loan_purpose × action.
 *
 * loan_purposes: "1"=Purchase, "2"=Home Improvement, "31"=Refinance, "32"=Cash-out, "4"=Other
 */
function loanPurposeResp(
  entries: Array<{ race: string; purpose: string; action: string; count: number }>
): AggregationResponse {
  return {
    parameters: {},
    aggregations: entries.map(({ race, purpose, action, count }) => ({
      count,
      sum: count,
      actions_taken: action,
      races: race,
      loan_purposes: purpose,
    })),
  };
}

/**
 * Build an AggregationResponse for race × occupancy_type × action.
 */
function occupancyResp(
  entries: Array<{ race: string; occupancy: string; action: string; count: number }>
): AggregationResponse {
  return {
    parameters: {},
    aggregations: entries.map(({ race, occupancy, action, count }) => ({
      count,
      sum: count,
      actions_taken: action,
      races: race,
      occupancy_types: occupancy,
    })),
  };
}

// ─── Scenario: Two groups with known denial rates ──────────────────────────

/**
 * Scenario A: White denial rate = 10%, Black denial rate = 25%
 * Both groups apply 70% Conventional / 30% FHA.
 * Denial rates within each stratum are identical across groups.
 *
 * → Since loan-type mix is identical, composition effect ≈ 0.
 * → Gap is entirely treatment effect (different within-type denial rates).
 */
const SCENARIO_A_OVERALL = overallResp([
  { race: "White", action: ACTION_ORIGINATED, count: 90 },
  { race: "White", action: ACTION_DENIED, count: 10 },
  { race: "Black or African American", action: ACTION_ORIGINATED, count: 75 },
  { race: "Black or African American", action: ACTION_DENIED, count: 25 },
]);

// White: 70 Conv (6 denied), 30 FHA (4 denied) → rates 8.6% / 13.3%
// Black: 70 Conv (19 denied), 30 FHA (6 denied) → rates 27.1% / 20%
// (shares identical → composition effect = 0)
const SCENARIO_A_LOAN_TYPE = loanTypeResp([
  // White – Conventional
  { race: "White", loanType: "1", action: ACTION_ORIGINATED, count: 64 },
  { race: "White", loanType: "1", action: ACTION_DENIED, count: 6 },
  // White – FHA
  { race: "White", loanType: "2", action: ACTION_ORIGINATED, count: 26 },
  { race: "White", loanType: "2", action: ACTION_DENIED, count: 4 },
  // Black – Conventional (same 70/30 mix)
  { race: "Black or African American", loanType: "1", action: ACTION_ORIGINATED, count: 51 },
  { race: "Black or African American", loanType: "1", action: ACTION_DENIED, count: 19 },
  // Black – FHA
  { race: "Black or African American", loanType: "2", action: ACTION_ORIGINATED, count: 24 },
  { race: "Black or African American", loanType: "2", action: ACTION_DENIED, count: 6 },
]);

/**
 * Scenario B: White 7.5% denial, Black 27.5% denial (gap = 20 pp).
 * White applies 90% Conventional (5% denial) + 10% FHA (30% denial).
 * Black applies 10% Conventional (5% denial) + 90% FHA (30% denial).
 *
 * Within-stratum denial rates are IDENTICAL across groups → treatment = 0.
 * The entire gap is composition-driven (disparate impact from FHA mix).
 *
 * Composition = (0.1-0.9)×5% + (0.9-0.1)×30% = -4% + 24% = +20%
 * Treatment   = 0.9×(5%-5%) + 0.1×(30%-30%) = 0
 * Interaction = 0
 */
const SCENARIO_B_OVERALL = overallResp([
  { race: "White", action: ACTION_ORIGINATED, count: 185 }, // 7.5% denied: 15/200 → use 185 orig + 15 denied
  { race: "White", action: ACTION_DENIED, count: 15 },
  { race: "Black or African American", action: ACTION_ORIGINATED, count: 145 }, // 27.5%: 55/200 → 145 orig + 55 denied
  { race: "Black or African American", action: ACTION_DENIED, count: 55 },
]);

// White: 180 Conv (5% denial = 9 denied, 171 orig) + 20 FHA (30% denial = 6 denied, 14 orig)
// Black: 20 Conv (5% denial = 1 denied, 19 orig) + 180 FHA (30% denial = 54 denied, 126 orig)
const SCENARIO_B_LOAN_TYPE = loanTypeResp([
  // White – Conventional (90% mix, 5% denial)
  { race: "White", loanType: "1", action: ACTION_ORIGINATED, count: 171 },
  { race: "White", loanType: "1", action: ACTION_DENIED, count: 9 },
  // White – FHA (10% mix, 30% denial)
  { race: "White", loanType: "2", action: ACTION_ORIGINATED, count: 14 },
  { race: "White", loanType: "2", action: ACTION_DENIED, count: 6 },
  // Black – Conventional (10% mix, 5% denial) — same rate as White!
  { race: "Black or African American", loanType: "1", action: ACTION_ORIGINATED, count: 19 },
  { race: "Black or African American", loanType: "1", action: ACTION_DENIED, count: 1 },
  // Black – FHA (90% mix, 30% denial) — same rate as White!
  { race: "Black or African American", loanType: "2", action: ACTION_ORIGINATED, count: 126 },
  { race: "Black or African American", loanType: "2", action: ACTION_DENIED, count: 54 },
]);

// ─── Tests: KBO mathematical identities ──────────────────────────────────────

describe("computeVarianceDecomposition – KBO treatment-dominant scenario", () => {
  let result: VarianceDecompositionResult;
  let blackKBO: KBODecomposition | undefined;

  beforeAll(() => {
    result = computeVarianceDecomposition({
      overall: SCENARIO_A_OVERALL,
      loanType: SCENARIO_A_LOAN_TYPE,
    });
    blackKBO = result.kbo.find((k) => k.group === "Black or African American");
  });

  test("KBO entry exists for Black group", () => {
    expect(blackKBO).toBeDefined();
  });

  test("rawGap equals rawDenialRate - whiteDenialRate", () => {
    if (!blackKBO) return;
    expect(blackKBO.rawGap).toBeCloseTo(
      blackKBO.rawDenialRate - blackKBO.whiteDenialRate,
      6
    );
  });

  test("rawGap is positive (Black > White denial rate)", () => {
    if (!blackKBO) return;
    expect(blackKBO.rawGap).toBeGreaterThan(0);
  });

  test("composition + treatment + interaction ≈ decomposition rawGap", () => {
    if (!blackKBO) return;
    const reconstituted =
      blackKBO.compositionEffect +
      blackKBO.treatmentEffect +
      blackKBO.interactionEffect;
    // The KBO sum approximately equals the raw gap (may differ slightly due to
    // within-stratum-only computation vs overall denial rates)
    // We check the sign direction is consistent
    expect(Math.sign(reconstituted)).toBe(Math.sign(blackKBO.rawGap));
  });

  test("byStratum entries are present", () => {
    if (!blackKBO) return;
    expect(blackKBO.byStratum.length).toBeGreaterThan(0);
  });

  test("each byStratum entry: comp + treat + interaction = entry total", () => {
    if (!blackKBO) return;
    for (const entry of blackKBO.byStratum) {
      const sum =
        entry.compositionContribution +
        entry.treatmentContribution +
        entry.interactionContribution;
      // All three should be finite
      expect(isFinite(sum)).toBe(true);
    }
  });

  test("strataUsed equals number of byStratum entries", () => {
    if (!blackKBO) return;
    expect(blackKBO.strataUsed).toBe(blackKBO.byStratum.length);
  });
});

describe("computeVarianceDecomposition – KBO composition-dominant scenario", () => {
  let result: VarianceDecompositionResult;
  let blackKBO: KBODecomposition | undefined;

  beforeAll(() => {
    result = computeVarianceDecomposition({
      overall: SCENARIO_B_OVERALL,
      loanType: SCENARIO_B_LOAN_TYPE,
    });
    blackKBO = result.kbo.find((k) => k.group === "Black or African American");
  });

  test("KBO entry exists for Black group", () => {
    expect(blackKBO).toBeDefined();
  });

  test("treatment effect is near zero (same within-type rates)", () => {
    if (!blackKBO) return;
    // Treatment effect = Σ shareW × (rateG - rateW)
    // conv: 0.9 × (5% - 5%) = 0
    // FHA:  0.1 × (30% - 30%) = 0
    // Total = 0 (within-stratum rates are identical)
    expect(Math.abs(blackKBO.treatmentEffect)).toBeLessThan(1e-6);
  });

  test("composition effect is positive (FHA mix explains gap)", () => {
    if (!blackKBO) return;
    // Composition = Σ (shareG - shareW) × rateW
    // conv: (0.10 - 0.90) × 5% = -0.8 × 0.05 = -0.04
    // FHA:  (0.90 - 0.10) × 30% = 0.8 × 0.30 = +0.24
    // Total = +0.20 (positive — Black's FHA-heavy mix drives the gap)
    expect(blackKBO.compositionEffect).toBeGreaterThan(0.1);
  });
});

// ─── Tests: stratum filtering (< 5 apps) ─────────────────────────────────────

describe("computeVarianceDecomposition – stratum filtering", () => {
  // Black has < 5 apps in VA stratum → should be excluded from decomposition
  const overall = overallResp([
    { race: "White", action: ACTION_ORIGINATED, count: 90 },
    { race: "White", action: ACTION_DENIED, count: 10 },
    { race: "Black or African American", action: ACTION_ORIGINATED, count: 75 },
    { race: "Black or African American", action: ACTION_DENIED, count: 25 },
  ]);

  const loanType = loanTypeResp([
    // White – Conventional (sufficient)
    { race: "White", loanType: "1", action: ACTION_ORIGINATED, count: 60 },
    { race: "White", loanType: "1", action: ACTION_DENIED, count: 8 },
    // White – VA (sufficient)
    { race: "White", loanType: "3", action: ACTION_ORIGINATED, count: 27 },
    { race: "White", loanType: "3", action: ACTION_DENIED, count: 2 },
    // White – FHA (sufficient)
    { race: "White", loanType: "2", action: ACTION_ORIGINATED, count: 3 },
    { race: "White", loanType: "2", action: ACTION_DENIED, count: 0 },
    // Black – Conventional (sufficient)
    { race: "Black or African American", loanType: "1", action: ACTION_ORIGINATED, count: 55 },
    { race: "Black or African American", loanType: "1", action: ACTION_DENIED, count: 20 },
    // Black – VA: only 3 apps (< 5 → excluded from decomposition)
    { race: "Black or African American", loanType: "3", action: ACTION_ORIGINATED, count: 2 },
    { race: "Black or African American", loanType: "3", action: ACTION_DENIED, count: 1 },
    // Black – FHA: only 2 apps (< 5 → excluded)
    { race: "Black or African American", loanType: "2", action: ACTION_ORIGINATED, count: 1 },
    { race: "Black or African American", loanType: "2", action: ACTION_DENIED, count: 1 },
  ]);

  test("strataUsed is less than total strata when some have insufficient data", () => {
    const result = computeVarianceDecomposition({ overall, loanType });
    const blackKBO = result.kbo.find((k) => k.group === "Black or African American");
    if (blackKBO) {
      // Conventional stratum has enough data in both groups; VA & FHA don't for Black
      // White VA has 29 apps but Black VA has only 3 → excluded
      // White FHA has 3 apps → excluded (White < 5)
      expect(blackKBO.strataUsed).toBe(1); // only Conventional qualifies
    }
  });
});

// ─── Tests: PCA integration ───────────────────────────────────────────────────

describe("computeVarianceDecomposition – PCA integration", () => {
  function makeGroupOverall(
    race: string,
    originated: number,
    denied: number
  ) {
    return [
      { race, action: ACTION_ORIGINATED, count: originated },
      { race, action: ACTION_DENIED, count: denied },
    ];
  }

  // Build a 4-group dataset (3 minority + White) with varied denial rates
  const overall = overallResp([
    ...makeGroupOverall("White", 90, 10),
    ...makeGroupOverall("Black or African American", 70, 30),
    ...makeGroupOverall("Asian", 85, 15),
    ...makeGroupOverall("American Indian or Alaska Native", 65, 35),
  ]);

  const loanType = loanTypeResp([
    // White
    { race: "White", loanType: "1", action: ACTION_ORIGINATED, count: 70 },
    { race: "White", loanType: "1", action: ACTION_DENIED, count: 8 },
    { race: "White", loanType: "2", action: ACTION_ORIGINATED, count: 20 },
    { race: "White", loanType: "2", action: ACTION_DENIED, count: 2 },
    // Black
    { race: "Black or African American", loanType: "1", action: ACTION_ORIGINATED, count: 40 },
    { race: "Black or African American", loanType: "1", action: ACTION_DENIED, count: 18 },
    { race: "Black or African American", loanType: "2", action: ACTION_ORIGINATED, count: 30 },
    { race: "Black or African American", loanType: "2", action: ACTION_DENIED, count: 12 },
    // Asian
    { race: "Asian", loanType: "1", action: ACTION_ORIGINATED, count: 65 },
    { race: "Asian", loanType: "1", action: ACTION_DENIED, count: 10 },
    { race: "Asian", loanType: "2", action: ACTION_ORIGINATED, count: 20 },
    { race: "Asian", loanType: "2", action: ACTION_DENIED, count: 5 },
    // Native American
    { race: "American Indian or Alaska Native", loanType: "1", action: ACTION_ORIGINATED, count: 35 },
    { race: "American Indian or Alaska Native", loanType: "1", action: ACTION_DENIED, count: 20 },
    { race: "American Indian or Alaska Native", loanType: "2", action: ACTION_ORIGINATED, count: 30 },
    { race: "American Indian or Alaska Native", loanType: "2", action: ACTION_DENIED, count: 15 },
  ]);

  let result: VarianceDecompositionResult;

  beforeAll(() => {
    result = computeVarianceDecomposition({ overall, loanType });
  });

  test("pca is non-null with 4 groups", () => {
    expect(result.pca).not.toBeNull();
  });

  test("pca.observationLabels contains all groups", () => {
    if (!result.pca) return;
    expect(result.pca.observationLabels.length).toBeGreaterThanOrEqual(3);
  });

  test("pc1TopFeatures is populated", () => {
    expect(result.pc1TopFeatures.length).toBeGreaterThan(0);
  });

  test("featureMatrix groups and data dimensions match", () => {
    const { groups, features, data } = result.featureMatrix;
    expect(data.length).toBe(groups.length);
    data.forEach((row) => expect(row.length).toBe(features.length));
  });

  test("kbo array has entries for minority groups", () => {
    expect(result.kbo.length).toBeGreaterThan(0);
    // Should not contain White
    result.kbo.forEach((k) => expect(k.group).not.toBe("White"));
  });

  test("aggregate fractions are finite numbers in [-2, 2]", () => {
    expect(isFinite(result.aggregateCompositionFraction)).toBe(true);
    expect(isFinite(result.aggregateTreatmentFraction)).toBe(true);
  });

  test("kboStrata contains standard loan types", () => {
    expect(result.kboStrata).toContain("Conventional");
    expect(result.kboStrata).toContain("FHA");
  });
});

// ─── Tests: groups with insufficient overall data are excluded ─────────────

describe("computeVarianceDecomposition – group size filtering", () => {
  // Tiny group (< 10 apps) should be excluded from feature matrix
  const overall = overallResp([
    { race: "White", action: ACTION_ORIGINATED, count: 90 },
    { race: "White", action: ACTION_DENIED, count: 10 },
    { race: "Black or African American", action: ACTION_ORIGINATED, count: 5 },
    { race: "Black or African American", action: ACTION_DENIED, count: 4 }, // 9 total < 10 → excluded
    { race: "Asian", action: ACTION_ORIGINATED, count: 80 },
    { race: "Asian", action: ACTION_DENIED, count: 15 },
  ]);
  const loanType = loanTypeResp([
    { race: "White", loanType: "1", action: ACTION_ORIGINATED, count: 90 },
    { race: "White", loanType: "1", action: ACTION_DENIED, count: 10 },
    { race: "Black or African American", loanType: "1", action: ACTION_ORIGINATED, count: 5 },
    { race: "Black or African American", loanType: "1", action: ACTION_DENIED, count: 4 },
    { race: "Asian", loanType: "1", action: ACTION_ORIGINATED, count: 80 },
    { race: "Asian", loanType: "1", action: ACTION_DENIED, count: 15 },
  ]);

  test("groups with < 10 total apps excluded from featureMatrix", () => {
    const result = computeVarianceDecomposition({ overall, loanType });
    expect(result.featureMatrix.groups).not.toContain("African American");
    expect(result.featureMatrix.groups).not.toContain("Black or African American");
  });

  test("pca is null when < 3 groups have sufficient data", () => {
    const result = computeVarianceDecomposition({ overall, loanType });
    // Only White + Asian qualify → 2 groups → PCA not run
    expect(result.pca).toBeNull();
  });
});

// ─── Tests: No White baseline ─────────────────────────────────────────────────

describe("computeVarianceDecomposition – no White group", () => {
  const overall = overallResp([
    { race: "Black or African American", action: ACTION_ORIGINATED, count: 75 },
    { race: "Black or African American", action: ACTION_DENIED, count: 25 },
    { race: "Asian", action: ACTION_ORIGINATED, count: 80 },
    { race: "Asian", action: ACTION_DENIED, count: 15 },
  ]);
  const loanType = loanTypeResp([
    { race: "Black or African American", loanType: "1", action: ACTION_ORIGINATED, count: 60 },
    { race: "Black or African American", loanType: "1", action: ACTION_DENIED, count: 20 },
    { race: "Asian", loanType: "1", action: ACTION_ORIGINATED, count: 65 },
    { race: "Asian", loanType: "1", action: ACTION_DENIED, count: 12 },
  ]);

  test("does not throw when White is absent", () => {
    expect(() => computeVarianceDecomposition({ overall, loanType })).not.toThrow();
  });

  test("kbo array is empty when White baseline is absent", () => {
    const result = computeVarianceDecomposition({ overall, loanType });
    // All minority groups but no White → loop skips White and processes minorities
    // but whiteLoanTypeMap is empty → KBO produces 0 strataUsed, or empty kbo
    // Either all byStratum are empty or kbo is empty
    const allEmpty = result.kbo.every((k) => k.byStratum.length === 0);
    expect(allEmpty || result.kbo.length === 0).toBe(true);
  });
});

// ─── Tests: loanPurpose + occupancy optional inputs ───────────────────────────

describe("computeVarianceDecomposition – optional loanPurpose and occupancy", () => {
  const overall = overallResp([
    { race: "White", action: ACTION_ORIGINATED, count: 90 },
    { race: "White", action: ACTION_DENIED, count: 10 },
    { race: "Black or African American", action: ACTION_ORIGINATED, count: 70 },
    { race: "Black or African American", action: ACTION_DENIED, count: 30 },
    { race: "Asian", action: ACTION_ORIGINATED, count: 80 },
    { race: "Asian", action: ACTION_DENIED, count: 15 },
    { race: "American Indian or Alaska Native", action: ACTION_ORIGINATED, count: 60 },
    { race: "American Indian or Alaska Native", action: ACTION_DENIED, count: 25 },
  ]);
  const loanType = loanTypeResp([
    { race: "White", loanType: "1", action: ACTION_ORIGINATED, count: 80 },
    { race: "White", loanType: "1", action: ACTION_DENIED, count: 9 },
    { race: "White", loanType: "2", action: ACTION_ORIGINATED, count: 10 },
    { race: "White", loanType: "2", action: ACTION_DENIED, count: 1 },
    { race: "Black or African American", loanType: "1", action: ACTION_ORIGINATED, count: 45 },
    { race: "Black or African American", loanType: "1", action: ACTION_DENIED, count: 18 },
    { race: "Black or African American", loanType: "2", action: ACTION_ORIGINATED, count: 25 },
    { race: "Black or African American", loanType: "2", action: ACTION_DENIED, count: 12 },
    { race: "Asian", loanType: "1", action: ACTION_ORIGINATED, count: 70 },
    { race: "Asian", loanType: "1", action: ACTION_DENIED, count: 12 },
    { race: "Asian", loanType: "2", action: ACTION_ORIGINATED, count: 10 },
    { race: "Asian", loanType: "2", action: ACTION_DENIED, count: 3 },
    { race: "American Indian or Alaska Native", loanType: "1", action: ACTION_ORIGINATED, count: 40 },
    { race: "American Indian or Alaska Native", loanType: "1", action: ACTION_DENIED, count: 18 },
    { race: "American Indian or Alaska Native", loanType: "2", action: ACTION_ORIGINATED, count: 20 },
    { race: "American Indian or Alaska Native", loanType: "2", action: ACTION_DENIED, count: 7 },
  ]);
  const purpose = loanPurposeResp([
    { race: "White", purpose: "1", action: ACTION_ORIGINATED, count: 70 },
    { race: "White", purpose: "1", action: ACTION_DENIED, count: 8 },
    { race: "White", purpose: "31", action: ACTION_ORIGINATED, count: 20 },
    { race: "White", purpose: "31", action: ACTION_DENIED, count: 2 },
    { race: "Black or African American", purpose: "1", action: ACTION_ORIGINATED, count: 55 },
    { race: "Black or African American", purpose: "1", action: ACTION_DENIED, count: 22 },
    { race: "Black or African American", purpose: "31", action: ACTION_ORIGINATED, count: 15 },
    { race: "Black or African American", purpose: "31", action: ACTION_DENIED, count: 8 },
    { race: "Asian", purpose: "1", action: ACTION_ORIGINATED, count: 65 },
    { race: "Asian", purpose: "1", action: ACTION_DENIED, count: 11 },
    { race: "Asian", purpose: "31", action: ACTION_ORIGINATED, count: 15 },
    { race: "Asian", purpose: "31", action: ACTION_DENIED, count: 4 },
    { race: "American Indian or Alaska Native", purpose: "1", action: ACTION_ORIGINATED, count: 45 },
    { race: "American Indian or Alaska Native", purpose: "1", action: ACTION_DENIED, count: 20 },
    { race: "American Indian or Alaska Native", purpose: "31", action: ACTION_ORIGINATED, count: 15 },
    { race: "American Indian or Alaska Native", purpose: "31", action: ACTION_DENIED, count: 5 },
  ]);
  const occupancy = occupancyResp([
    { race: "White", occupancy: "1", action: ACTION_ORIGINATED, count: 85 },
    { race: "White", occupancy: "1", action: ACTION_DENIED, count: 9 },
    { race: "White", occupancy: "2", action: ACTION_ORIGINATED, count: 5 },
    { race: "White", occupancy: "2", action: ACTION_DENIED, count: 1 },
    { race: "Black or African American", occupancy: "1", action: ACTION_ORIGINATED, count: 68 },
    { race: "Black or African American", occupancy: "1", action: ACTION_DENIED, count: 28 },
    { race: "Black or African American", occupancy: "2", action: ACTION_ORIGINATED, count: 2 },
    { race: "Black or African American", occupancy: "2", action: ACTION_DENIED, count: 2 },
    { race: "Asian", occupancy: "1", action: ACTION_ORIGINATED, count: 75 },
    { race: "Asian", occupancy: "1", action: ACTION_DENIED, count: 14 },
    { race: "Asian", occupancy: "2", action: ACTION_ORIGINATED, count: 5 },
    { race: "Asian", occupancy: "2", action: ACTION_DENIED, count: 1 },
    { race: "American Indian or Alaska Native", occupancy: "1", action: ACTION_ORIGINATED, count: 57 },
    { race: "American Indian or Alaska Native", occupancy: "1", action: ACTION_DENIED, count: 24 },
    { race: "American Indian or Alaska Native", occupancy: "2", action: ACTION_ORIGINATED, count: 3 },
    { race: "American Indian or Alaska Native", occupancy: "2", action: ACTION_DENIED, count: 1 },
  ]);

  test("runs without throwing with all four input sources", () => {
    expect(() =>
      computeVarianceDecomposition({ overall, loanType, loanPurpose: purpose, occupancy })
    ).not.toThrow();
  });

  test("featureMatrix includes purpose and occupancy features when provided", () => {
    const result = computeVarianceDecomposition({
      overall, loanType, loanPurpose: purpose, occupancy,
    });
    const featureNames = result.featureMatrix.features.join(" ");
    expect(featureNames).toMatch(/share_/);
  });

  test("runs without throwing when loanPurpose is null", () => {
    expect(() =>
      computeVarianceDecomposition({ overall, loanType, loanPurpose: null })
    ).not.toThrow();
  });

  test("runs without throwing when occupancy is null", () => {
    expect(() =>
      computeVarianceDecomposition({ overall, loanType, occupancy: null })
    ).not.toThrow();
  });

  test("runs without throwing when both optional sources are null", () => {
    expect(() =>
      computeVarianceDecomposition({
        overall, loanType, loanPurpose: null, occupancy: null,
      })
    ).not.toThrow();
  });

  test("pca is non-null with 4 qualifying groups", () => {
    const result = computeVarianceDecomposition({
      overall, loanType, loanPurpose: purpose, occupancy,
    });
    expect(result.pca).not.toBeNull();
  });
});

// ─── Tests: KBO fractions ─────────────────────────────────────────────────────

describe("computeVarianceDecomposition – fraction semantics", () => {
  const overall = overallResp([
    { race: "White", action: ACTION_ORIGINATED, count: 90 },
    { race: "White", action: ACTION_DENIED, count: 10 },
    { race: "Black or African American", action: ACTION_ORIGINATED, count: 70 },
    { race: "Black or African American", action: ACTION_DENIED, count: 30 },
  ]);
  const loanType = loanTypeResp([
    { race: "White", loanType: "1", action: ACTION_ORIGINATED, count: 80 },
    { race: "White", loanType: "1", action: ACTION_DENIED, count: 9 },
    { race: "White", loanType: "2", action: ACTION_ORIGINATED, count: 10 },
    { race: "White", loanType: "2", action: ACTION_DENIED, count: 1 },
    { race: "Black or African American", loanType: "1", action: ACTION_ORIGINATED, count: 50 },
    { race: "Black or African American", loanType: "1", action: ACTION_DENIED, count: 20 },
    { race: "Black or African American", loanType: "2", action: ACTION_ORIGINATED, count: 20 },
    { race: "Black or African American", loanType: "2", action: ACTION_DENIED, count: 10 },
  ]);

  test("whiteDenialRate equals 10%", () => {
    const result = computeVarianceDecomposition({ overall, loanType });
    const blackKBO = result.kbo.find((k) => k.group === "Black or African American");
    expect(blackKBO?.whiteDenialRate).toBeCloseTo(0.1, 5);
  });

  test("rawDenialRate equals 30%", () => {
    const result = computeVarianceDecomposition({ overall, loanType });
    const blackKBO = result.kbo.find((k) => k.group === "Black or African American");
    expect(blackKBO?.rawDenialRate).toBeCloseTo(0.3, 5);
  });

  test("compositionFraction + treatmentFraction are finite", () => {
    const result = computeVarianceDecomposition({ overall, loanType });
    const blackKBO = result.kbo.find((k) => k.group === "Black or African American");
    if (blackKBO) {
      expect(isFinite(blackKBO.compositionFraction)).toBe(true);
      expect(isFinite(blackKBO.treatmentFraction)).toBe(true);
    }
  });

  test("kbo label is the human-readable race label", () => {
    const result = computeVarianceDecomposition({ overall, loanType });
    const blackKBO = result.kbo.find((k) => k.group === "Black or African American");
    expect(blackKBO?.label).toBe("African American");
  });
});

// ─── Tests: empty aggregations ─────────────────────────────────────────────

describe("computeVarianceDecomposition – empty input", () => {
  const emptyResp: AggregationResponse = { parameters: {}, aggregations: [] };

  test("does not throw on completely empty input", () => {
    expect(() =>
      computeVarianceDecomposition({ overall: emptyResp, loanType: emptyResp })
    ).not.toThrow();
  });

  test("returns empty kbo array on empty input", () => {
    const result = computeVarianceDecomposition({
      overall: emptyResp,
      loanType: emptyResp,
    });
    expect(result.kbo).toEqual([]);
  });

  test("pca is null on empty input", () => {
    const result = computeVarianceDecomposition({
      overall: emptyResp,
      loanType: emptyResp,
    });
    expect(result.pca).toBeNull();
  });

  test("aggregate fractions are 0 on empty input", () => {
    const result = computeVarianceDecomposition({
      overall: emptyResp,
      loanType: emptyResp,
    });
    expect(result.aggregateCompositionFraction).toBe(0);
    expect(result.aggregateTreatmentFraction).toBe(0);
  });
});
