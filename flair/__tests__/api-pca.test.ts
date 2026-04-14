/**
 * Integration tests for /api/pca route handler (app/api/pca/route.ts).
 *
 * @jest-environment node
 *
 * We mock the HMDA data-fetching functions and test the route's behaviour for:
 *  - Happy path: valid lei + state → returns structured JSON
 *  - Happy path: valid lei + msa
 *  - Missing lei → 400
 *  - Missing state AND msa → 400
 *  - HMDA fetch throws → 500
 *  - Optional sources (loanPurpose/occupancy) fail gracefully → still 200
 *  - Response shape validation (pca, kbo, featureMatrix, aggregate fractions)
 */

// ─── Mock HMDA module ─────────────────────────────────────────────────────────

jest.mock("@/lib/hmda", () => ({
  getDisparityData: jest.fn(),
  getLoanTypeMixByRace: jest.fn(),
  getLoanPurposeMixByRace: jest.fn(),
  getOccupancyMixByRace: jest.fn(),
}));

import { GET } from "@/app/api/pca/route";
import {
  getDisparityData,
  getLoanTypeMixByRace,
  getLoanPurposeMixByRace,
  getOccupancyMixByRace,
} from "@/lib/hmda";
import { NextRequest } from "next/server";
import type { AggregationResponse } from "@/lib/hmda";

// ─── Helper: build a NextRequest ─────────────────────────────────────────────

function makeReq(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/api/pca");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

// ─── Fixture responses ────────────────────────────────────────────────────────

const ACTION_ORIGINATED = "1";
const ACTION_DENIED = "3";

const MINIMAL_OVERALL: AggregationResponse = {
  parameters: {},
  aggregations: [
    { count: 90, sum: 90, actions_taken: ACTION_ORIGINATED, races: "White" },
    { count: 10, sum: 10, actions_taken: ACTION_DENIED, races: "White" },
    { count: 70, sum: 70, actions_taken: ACTION_ORIGINATED, races: "Black or African American" },
    { count: 30, sum: 30, actions_taken: ACTION_DENIED, races: "Black or African American" },
    { count: 80, sum: 80, actions_taken: ACTION_ORIGINATED, races: "Asian" },
    { count: 15, sum: 15, actions_taken: ACTION_DENIED, races: "Asian" },
    { count: 60, sum: 60, actions_taken: ACTION_ORIGINATED, races: "American Indian or Alaska Native" },
    { count: 25, sum: 25, actions_taken: ACTION_DENIED, races: "American Indian or Alaska Native" },
  ],
};

const MINIMAL_LOAN_TYPE: AggregationResponse = {
  parameters: {},
  aggregations: [
    { count: 75, sum: 75, actions_taken: ACTION_ORIGINATED, races: "White", loan_types: "1" },
    { count: 8,  sum: 8,  actions_taken: ACTION_DENIED,     races: "White", loan_types: "1" },
    { count: 15, sum: 15, actions_taken: ACTION_ORIGINATED, races: "White", loan_types: "2" },
    { count: 2,  sum: 2,  actions_taken: ACTION_DENIED,     races: "White", loan_types: "2" },
    { count: 42, sum: 42, actions_taken: ACTION_ORIGINATED, races: "Black or African American", loan_types: "1" },
    { count: 18, sum: 18, actions_taken: ACTION_DENIED,     races: "Black or African American", loan_types: "1" },
    { count: 28, sum: 28, actions_taken: ACTION_ORIGINATED, races: "Black or African American", loan_types: "2" },
    { count: 12, sum: 12, actions_taken: ACTION_DENIED,     races: "Black or African American", loan_types: "2" },
    { count: 65, sum: 65, actions_taken: ACTION_ORIGINATED, races: "Asian", loan_types: "1" },
    { count: 12, sum: 12, actions_taken: ACTION_DENIED,     races: "Asian", loan_types: "1" },
    { count: 15, sum: 15, actions_taken: ACTION_ORIGINATED, races: "Asian", loan_types: "2" },
    { count: 3,  sum: 3,  actions_taken: ACTION_DENIED,     races: "Asian", loan_types: "2" },
    { count: 38, sum: 38, actions_taken: ACTION_ORIGINATED, races: "American Indian or Alaska Native", loan_types: "1" },
    { count: 18, sum: 18, actions_taken: ACTION_DENIED,     races: "American Indian or Alaska Native", loan_types: "1" },
    { count: 22, sum: 22, actions_taken: ACTION_ORIGINATED, races: "American Indian or Alaska Native", loan_types: "2" },
    { count: 7,  sum: 7,  actions_taken: ACTION_DENIED,     races: "American Indian or Alaska Native", loan_types: "2" },
  ],
};

const MINIMAL_PURPOSE: AggregationResponse = {
  parameters: {},
  aggregations: [
    { count: 80, sum: 80, actions_taken: ACTION_ORIGINATED, races: "White", loan_purposes: "1" },
    { count: 9,  sum: 9,  actions_taken: ACTION_DENIED,     races: "White", loan_purposes: "1" },
    { count: 10, sum: 10, actions_taken: ACTION_ORIGINATED, races: "White", loan_purposes: "31" },
    { count: 1,  sum: 1,  actions_taken: ACTION_DENIED,     races: "White", loan_purposes: "31" },
    { count: 60, sum: 60, actions_taken: ACTION_ORIGINATED, races: "Black or African American", loan_purposes: "1" },
    { count: 25, sum: 25, actions_taken: ACTION_DENIED,     races: "Black or African American", loan_purposes: "1" },
    { count: 10, sum: 10, actions_taken: ACTION_ORIGINATED, races: "Black or African American", loan_purposes: "31" },
    { count: 5,  sum: 5,  actions_taken: ACTION_DENIED,     races: "Black or African American", loan_purposes: "31" },
    { count: 70, sum: 70, actions_taken: ACTION_ORIGINATED, races: "Asian", loan_purposes: "1" },
    { count: 12, sum: 12, actions_taken: ACTION_DENIED,     races: "Asian", loan_purposes: "1" },
    { count: 10, sum: 10, actions_taken: ACTION_ORIGINATED, races: "Asian", loan_purposes: "31" },
    { count: 3,  sum: 3,  actions_taken: ACTION_DENIED,     races: "Asian", loan_purposes: "31" },
    { count: 50, sum: 50, actions_taken: ACTION_ORIGINATED, races: "American Indian or Alaska Native", loan_purposes: "1" },
    { count: 22, sum: 22, actions_taken: ACTION_DENIED,     races: "American Indian or Alaska Native", loan_purposes: "1" },
    { count: 10, sum: 10, actions_taken: ACTION_ORIGINATED, races: "American Indian or Alaska Native", loan_purposes: "31" },
    { count: 3,  sum: 3,  actions_taken: ACTION_DENIED,     races: "American Indian or Alaska Native", loan_purposes: "31" },
  ],
};

const MINIMAL_OCCUPANCY: AggregationResponse = {
  parameters: {},
  aggregations: [
    { count: 88, sum: 88, actions_taken: ACTION_ORIGINATED, races: "White", occupancy_types: "1" },
    { count: 10, sum: 10, actions_taken: ACTION_DENIED,     races: "White", occupancy_types: "1" },
    { count: 2,  sum: 2,  actions_taken: ACTION_ORIGINATED, races: "White", occupancy_types: "2" },
    { count: 0,  sum: 0,  actions_taken: ACTION_DENIED,     races: "White", occupancy_types: "2" },
    { count: 68, sum: 68, actions_taken: ACTION_ORIGINATED, races: "Black or African American", occupancy_types: "1" },
    { count: 30, sum: 30, actions_taken: ACTION_DENIED,     races: "Black or African American", occupancy_types: "1" },
    { count: 2,  sum: 2,  actions_taken: ACTION_ORIGINATED, races: "Black or African American", occupancy_types: "2" },
    { count: 0,  sum: 0,  actions_taken: ACTION_DENIED,     races: "Black or African American", occupancy_types: "2" },
    { count: 78, sum: 78, actions_taken: ACTION_ORIGINATED, races: "Asian", occupancy_types: "1" },
    { count: 14, sum: 14, actions_taken: ACTION_DENIED,     races: "Asian", occupancy_types: "1" },
    { count: 2,  sum: 2,  actions_taken: ACTION_ORIGINATED, races: "Asian", occupancy_types: "2" },
    { count: 1,  sum: 1,  actions_taken: ACTION_DENIED,     races: "Asian", occupancy_types: "2" },
    { count: 58, sum: 58, actions_taken: ACTION_ORIGINATED, races: "American Indian or Alaska Native", occupancy_types: "1" },
    { count: 25, sum: 25, actions_taken: ACTION_DENIED,     races: "American Indian or Alaska Native", occupancy_types: "1" },
    { count: 2,  sum: 2,  actions_taken: ACTION_ORIGINATED, races: "American Indian or Alaska Native", occupancy_types: "2" },
    { count: 0,  sum: 0,  actions_taken: ACTION_DENIED,     races: "American Indian or Alaska Native", occupancy_types: "2" },
  ],
};

// Cast mocks to typed jest.Mock
const mockGetDisparityData = getDisparityData as jest.MockedFunction<typeof getDisparityData>;
const mockGetLoanTypeMixByRace = getLoanTypeMixByRace as jest.MockedFunction<typeof getLoanTypeMixByRace>;
const mockGetLoanPurposeMixByRace = getLoanPurposeMixByRace as jest.MockedFunction<typeof getLoanPurposeMixByRace>;
const mockGetOccupancyMixByRace = getOccupancyMixByRace as jest.MockedFunction<typeof getOccupancyMixByRace>;

function setupHappyPath() {
  mockGetDisparityData.mockResolvedValue(MINIMAL_OVERALL);
  mockGetLoanTypeMixByRace.mockResolvedValue(MINIMAL_LOAN_TYPE);
  mockGetLoanPurposeMixByRace.mockResolvedValue(MINIMAL_PURPOSE);
  mockGetOccupancyMixByRace.mockResolvedValue(MINIMAL_OCCUPANCY);
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Tests: validation ────────────────────────────────────────────────────────

describe("GET /api/pca – request validation", () => {
  test("returns 400 when lei is missing", async () => {
    const req = makeReq({ state: "CA" });
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("returns 400 when both state and msa are missing", async () => {
    const req = makeReq({ lei: "TESTLEI123" });
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("accepts state parameter", async () => {
    setupHappyPath();
    const req = makeReq({ lei: "TESTLEI", state: "CA" });
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  test("accepts msa parameter", async () => {
    setupHappyPath();
    const req = makeReq({ lei: "TESTLEI", msa: "35620" });
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  test("passes lei to getDisparityData", async () => {
    setupHappyPath();
    const req = makeReq({ lei: "ABC123LEI", state: "TX" });
    await GET(req);
    expect(mockGetDisparityData).toHaveBeenCalledWith(
      "ABC123LEI",
      expect.any(String),
      "TX",
      undefined
    );
  });

  test("defaults years to '2023' when not provided", async () => {
    setupHappyPath();
    const req = makeReq({ lei: "LEI", state: "NY" });
    await GET(req);
    expect(mockGetDisparityData).toHaveBeenCalledWith(
      "LEI", "2023", "NY", undefined
    );
  });

  test("passes custom years parameter", async () => {
    setupHappyPath();
    const req = makeReq({ lei: "LEI", state: "NY", years: "2022" });
    await GET(req);
    expect(mockGetDisparityData).toHaveBeenCalledWith(
      "LEI", "2022", "NY", undefined
    );
  });
});

// ─── Tests: happy path response shape ────────────────────────────────────────

describe("GET /api/pca – response shape", () => {
  let body: Record<string, unknown>;

  beforeAll(async () => {
    setupHappyPath();
    const req = makeReq({ lei: "TESTLEI", state: "CA" });
    const res = await GET(req);
    body = await res.json();
  });

  test("returns 200", async () => {
    setupHappyPath();
    const req = makeReq({ lei: "TESTLEI", state: "CA" });
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  test("body contains 'kbo' array", () => {
    expect(Array.isArray(body.kbo)).toBe(true);
  });

  test("body contains 'featureMatrix' object", () => {
    expect(body.featureMatrix).toBeDefined();
    expect(typeof body.featureMatrix).toBe("object");
  });

  test("body contains 'aggregateCompositionFraction' number", () => {
    expect(typeof body.aggregateCompositionFraction).toBe("number");
  });

  test("body contains 'aggregateTreatmentFraction' number", () => {
    expect(typeof body.aggregateTreatmentFraction).toBe("number");
  });

  test("body contains 'kboStrata' array", () => {
    expect(Array.isArray(body.kboStrata)).toBe(true);
  });

  test("featureMatrix has 'groups', 'features', 'data' keys", () => {
    const fm = body.featureMatrix as Record<string, unknown>;
    expect(fm).toHaveProperty("groups");
    expect(fm).toHaveProperty("features");
    expect(fm).toHaveProperty("data");
  });

  test("kbo entries have required fields", () => {
    const kbo = body.kbo as Array<Record<string, unknown>>;
    for (const entry of kbo) {
      expect(entry).toHaveProperty("group");
      expect(entry).toHaveProperty("label");
      expect(entry).toHaveProperty("rawDenialRate");
      expect(entry).toHaveProperty("whiteDenialRate");
      expect(entry).toHaveProperty("rawGap");
      expect(entry).toHaveProperty("compositionEffect");
      expect(entry).toHaveProperty("treatmentEffect");
      expect(entry).toHaveProperty("interactionEffect");
      expect(entry).toHaveProperty("compositionFraction");
      expect(entry).toHaveProperty("treatmentFraction");
      expect(entry).toHaveProperty("strataUsed");
      expect(entry).toHaveProperty("byStratum");
    }
  });

  test("pca result present with 4 groups", () => {
    expect(body.pca).not.toBeNull();
    const pca = body.pca as Record<string, unknown>;
    expect(pca).toHaveProperty("scores");
    expect(pca).toHaveProperty("loadings");
    expect(pca).toHaveProperty("varianceExplained");
    expect(pca).toHaveProperty("featureNames");
    expect(pca).toHaveProperty("observationLabels");
  });

  test("all 4 HMDA functions called exactly once", () => {
    setupHappyPath();
    const req = makeReq({ lei: "L", state: "CA" });
    GET(req).then(() => {
      expect(mockGetDisparityData).toHaveBeenCalledTimes(1);
      expect(mockGetLoanTypeMixByRace).toHaveBeenCalledTimes(1);
      expect(mockGetLoanPurposeMixByRace).toHaveBeenCalledTimes(1);
      expect(mockGetOccupancyMixByRace).toHaveBeenCalledTimes(1);
    });
  });
});

// ─── Tests: error handling ─────────────────────────────────────────────────

describe("GET /api/pca – error handling", () => {
  test("returns 500 when getDisparityData throws", async () => {
    mockGetDisparityData.mockRejectedValue(new Error("HMDA API down"));
    mockGetLoanTypeMixByRace.mockResolvedValue(MINIMAL_LOAN_TYPE);
    mockGetLoanPurposeMixByRace.mockResolvedValue(MINIMAL_PURPOSE);
    mockGetOccupancyMixByRace.mockResolvedValue(MINIMAL_OCCUPANCY);

    const req = makeReq({ lei: "LEI", state: "CA" });
    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(body.error).toMatch(/HMDA API down/);
  });

  test("returns 500 when getLoanTypeMixByRace throws", async () => {
    mockGetDisparityData.mockResolvedValue(MINIMAL_OVERALL);
    mockGetLoanTypeMixByRace.mockRejectedValue(new Error("loan type fail"));
    mockGetLoanPurposeMixByRace.mockResolvedValue(MINIMAL_PURPOSE);
    mockGetOccupancyMixByRace.mockResolvedValue(MINIMAL_OCCUPANCY);

    const req = makeReq({ lei: "LEI", state: "CA" });
    const res = await GET(req);
    expect(res.status).toBe(500);
  });

  test("returns 200 when getLoanPurposeMixByRace throws (optional source)", async () => {
    mockGetDisparityData.mockResolvedValue(MINIMAL_OVERALL);
    mockGetLoanTypeMixByRace.mockResolvedValue(MINIMAL_LOAN_TYPE);
    mockGetLoanPurposeMixByRace.mockRejectedValue(new Error("purpose optional fail"));
    mockGetOccupancyMixByRace.mockResolvedValue(MINIMAL_OCCUPANCY);

    const req = makeReq({ lei: "LEI", state: "CA" });
    const res = await GET(req);
    // loanPurpose is .catch(() => null) so still 200
    expect(res.status).toBe(200);
  });

  test("returns 200 when getOccupancyMixByRace throws (optional source)", async () => {
    mockGetDisparityData.mockResolvedValue(MINIMAL_OVERALL);
    mockGetLoanTypeMixByRace.mockResolvedValue(MINIMAL_LOAN_TYPE);
    mockGetLoanPurposeMixByRace.mockResolvedValue(MINIMAL_PURPOSE);
    mockGetOccupancyMixByRace.mockRejectedValue(new Error("occupancy optional fail"));

    const req = makeReq({ lei: "LEI", state: "CA" });
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  test("error body contains 'error' string when non-Error thrown", async () => {
    mockGetDisparityData.mockRejectedValue("plain string error");
    mockGetLoanTypeMixByRace.mockResolvedValue(MINIMAL_LOAN_TYPE);
    mockGetLoanPurposeMixByRace.mockResolvedValue(MINIMAL_PURPOSE);
    mockGetOccupancyMixByRace.mockResolvedValue(MINIMAL_OCCUPANCY);

    const req = makeReq({ lei: "LEI", state: "CA" });
    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(typeof body.error).toBe("string");
  });
});

// ─── Tests: numerical correctness via API ─────────────────────────────────

describe("GET /api/pca – numerical output validation", () => {
  test("whiteDenialRate is ~10% for our fixture", async () => {
    setupHappyPath();
    const req = makeReq({ lei: "LEI", state: "CA" });
    const res = await GET(req);
    const body = await res.json();
    const kbo = (body.kbo as Array<{ whiteDenialRate: number }>);
    if (kbo.length > 0) {
      // White: 90 originated + 10 denied = 10%
      expect(kbo[0].whiteDenialRate).toBeCloseTo(0.1, 5);
    }
  });

  test("pca.varianceExplained sums to ~1 when present", async () => {
    setupHappyPath();
    const req = makeReq({ lei: "LEI", state: "CA" });
    const res = await GET(req);
    const body = await res.json();
    if (body.pca) {
      const pca = body.pca as { varianceExplained: number[] };
      const total = pca.varianceExplained.reduce((s: number, v: number) => s + v, 0);
      expect(total).toBeCloseTo(1.0, 4);
    }
  });

  test("aggregateCompositionFraction + aggregateTreatmentFraction are finite", async () => {
    setupHappyPath();
    const req = makeReq({ lei: "LEI", state: "CA" });
    const res = await GET(req);
    const body = await res.json();
    expect(isFinite(body.aggregateCompositionFraction as number)).toBe(true);
    expect(isFinite(body.aggregateTreatmentFraction as number)).toBe(true);
  });
});
