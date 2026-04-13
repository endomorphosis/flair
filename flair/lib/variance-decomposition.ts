/**
 * HMDA-specific variance decomposition.
 *
 * Builds per-racial-group feature vectors from HMDA aggregate data, then:
 *   1. Runs PCA across racial groups to discover the main axes of inter-group
 *      variation and identify which lending characteristics drive them.
 *   2. Applies a Kitagawa-Blinder-Oaxaca (KBO) decomposition to split the
 *      raw denial-rate gap between each minority group and White applicants
 *      into two legally distinct components:
 *
 *        • Composition effect (disparate *impact*):
 *            Part of the gap explained by different distributions of observable
 *            loan characteristics (e.g., more FHA loans in one group).  A
 *            neutral, facially-lawful policy that happens to screen differently
 *            across racial compositions falls here.
 *
 *        • Treatment effect (disparate *treatment*):
 *            Part of the gap that persists WITHIN the same loan type — i.e.,
 *            similarly-situated applicants denied at different rates by race.
 *            This is the primary evidence of intentional discrimination.
 *
 * References:
 *   Oaxaca (1973), Blinder (1973) — wage gap decomposition (origin method)
 *   Kitagawa (1955) — earlier formulation for rate decomposition
 *   Zhu & Barth (2006) — application to mortgage lending disparities
 */

import { AggregationResponse } from "./hmda";
import { RACE_LABELS } from "./constants";
import { ACTION_ORIGINATED, ACTION_DENIED } from "./constants";
import { runPCA, PCAResult, Matrix } from "./pca";

// ─── Internal helpers ─────────────────────────────────────────────────────────

const LOAN_TYPE_LABELS: Record<string, string> = {
  "1": "Conventional",
  "2": "FHA",
  "3": "VA",
  "4": "USDA",
};

const LOAN_PURPOSE_LABELS: Record<string, string> = {
  "1": "Purchase",
  "2": "Home Improvement",
  "31": "Refinance",
  "32": "Cash-out Refi",
  "4": "Other Purpose",
};

/** Collapse an AggregationResponse into { group → stratum → { denials, originations } } */
function collapseByGroupAndStratum(
  data: AggregationResponse,
  groupKey: "races" | "ethnicities",
  stratumKey: "loan_types" | "loan_purposes" | "occupancy_types"
): Map<string, Map<string, { denials: number; originations: number }>> {
  const result = new Map<
    string,
    Map<string, { denials: number; originations: number }>
  >();

  for (const agg of data.aggregations) {
    const group = agg[groupKey];
    const stratum = agg[stratumKey];
    if (!group || !stratum) continue;

    if (!result.has(group)) result.set(group, new Map());
    const groupMap = result.get(group)!;
    if (!groupMap.has(stratum))
      groupMap.set(stratum, { denials: 0, originations: 0 });
    const entry = groupMap.get(stratum)!;

    if (agg.actions_taken === ACTION_DENIED) entry.denials += agg.count;
    else if (agg.actions_taken === ACTION_ORIGINATED) entry.originations += agg.count;
  }

  return result;
}

/** Collapse into { group → { denials, originations } } */
function collapseByGroup(
  data: AggregationResponse,
  groupKey: "races" | "ethnicities"
): Map<string, { denials: number; originations: number }> {
  const result = new Map<string, { denials: number; originations: number }>();

  for (const agg of data.aggregations) {
    const group = agg[groupKey];
    if (!group) continue;
    if (!result.has(group)) result.set(group, { denials: 0, originations: 0 });
    const entry = result.get(group)!;
    if (agg.actions_taken === ACTION_DENIED) entry.denials += agg.count;
    else if (agg.actions_taken === ACTION_ORIGINATED) entry.originations += agg.count;
  }

  return result;
}

// ─── KBO decomposition ────────────────────────────────────────────────────────

export interface KBOStratumEntry {
  /** Loan type (or other stratum) label */
  label: string;
  /** (share_g − share_w) × denial_rate_w  — composition / disparate impact */
  compositionContribution: number;
  /** share_w × (denial_rate_g − denial_rate_w)  — treatment / disparate treatment */
  treatmentContribution: number;
  /** (share_g − share_w) × (denial_rate_g − denial_rate_w)  — interaction */
  interactionContribution: number;
  /** Group's share of applications in this stratum */
  shareGroup: number;
  /** White's share of applications in this stratum */
  shareWhite: number;
  /** Group denial rate within this stratum */
  denialRateGroup: number;
  /** White denial rate within this stratum */
  denialRateWhite: number;
}

export interface KBODecomposition {
  group: string;
  label: string;
  /** Actual denial rate for this group */
  rawDenialRate: number;
  /** White denial rate */
  whiteDenialRate: number;
  /** rawDenialRate − whiteDenialRate */
  rawGap: number;
  /**
   * Composition effect: gap that would exist even with White's denial rates,
   * because the group applies for different loan types.
   * → Evidence of disparate impact on the group's loan-type distribution.
   */
  compositionEffect: number;
  /**
   * Treatment effect: gap within each loan type (same stratum, same type,
   * different denial rate by race).
   * → Strongest available evidence of disparate treatment.
   */
  treatmentEffect: number;
  /** Small interaction term (usually < 5% of gap). */
  interactionEffect: number;
  /** Fraction of raw gap attributable to composition [0, 1] */
  compositionFraction: number;
  /** Fraction of raw gap attributable to treatment [0, 1] */
  treatmentFraction: number;
  /** Number of strata with sufficient data (≥ 5 apps each group) */
  strataUsed: number;
  /** Per-stratum breakdown */
  byStratum: KBOStratumEntry[];
}

function computeKBOForGroup(
  group: string,
  groupMap: Map<string, { denials: number; originations: number }>,
  whiteMap: Map<string, { denials: number; originations: number }>,
  stratumLabels: Record<string, string>
): Omit<KBODecomposition, "rawDenialRate" | "whiteDenialRate" | "rawGap" | "label"> {
  // Total applications per group (from known strata only)
  let totalGroup = 0;
  let totalWhite = 0;
  for (const [, v] of groupMap) totalGroup += v.denials + v.originations;
  for (const [, v] of whiteMap) totalWhite += v.denials + v.originations;

  const byStratum: KBOStratumEntry[] = [];
  let compositionEffect = 0;
  let treatmentEffect = 0;
  let interactionEffect = 0;
  let strataUsed = 0;

  const allStrata = new Set([...groupMap.keys(), ...whiteMap.keys()]);

  for (const stratum of allStrata) {
    const g = groupMap.get(stratum) ?? { denials: 0, originations: 0 };
    const w = whiteMap.get(stratum) ?? { denials: 0, originations: 0 };
    const nG = g.denials + g.originations;
    const nW = w.denials + w.originations;

    if (nG < 5 || nW < 5) continue; // insufficient data for this stratum

    const shareG = totalGroup > 0 ? nG / totalGroup : 0;
    const shareW = totalWhite > 0 ? nW / totalWhite : 0;
    const rateG = nG > 0 ? g.denials / nG : 0;
    const rateW = nW > 0 ? w.denials / nW : 0;

    const comp = (shareG - shareW) * rateW;
    const treat = shareW * (rateG - rateW);
    const inter = (shareG - shareW) * (rateG - rateW);

    compositionEffect += comp;
    treatmentEffect += treat;
    interactionEffect += inter;
    strataUsed++;

    byStratum.push({
      label: stratumLabels[stratum] ?? stratum,
      compositionContribution: comp,
      treatmentContribution: treat,
      interactionContribution: inter,
      shareGroup: shareG,
      shareWhite: shareW,
      denialRateGroup: rateG,
      denialRateWhite: rateW,
    });
  }

  const rawGapApprox = compositionEffect + treatmentEffect + interactionEffect;
  const denom = Math.abs(rawGapApprox) > 1e-6 ? rawGapApprox : 1;
  const compositionFraction = compositionEffect / denom;
  const treatmentFraction = treatmentEffect / denom;

  return {
    group,
    compositionEffect,
    treatmentEffect,
    interactionEffect,
    compositionFraction,
    treatmentFraction,
    strataUsed,
    byStratum,
  };
}

// ─── Feature matrix builder ────────────────────────────────────────────────────

interface GroupFeatures {
  group: string;
  label: string;
  features: Record<string, number>;
  applications: number;
}

function buildGroupFeatures(
  overallByGroup: Map<string, { denials: number; originations: number }>,
  loanTypeByGroup: Map<
    string,
    Map<string, { denials: number; originations: number }>
  >,
  loanPurposeByGroup: Map<
    string,
    Map<string, { denials: number; originations: number }>
  > | null,
  occupancyByGroup: Map<
    string,
    Map<string, { denials: number; originations: number }>
  > | null
): GroupFeatures[] {
  const groups: GroupFeatures[] = [];

  for (const [group, overall] of overallByGroup) {
    const n = overall.denials + overall.originations;
    if (n < 10) continue; // skip groups with negligible data

    const f: Record<string, number> = {};

    // Overall denial rate
    f["denial_rate"] = n > 0 ? overall.denials / n : 0;

    // Log-applications (size control) — log(n+1) to reduce leverage of very large groups
    f["log_applications"] = Math.log(n + 1);

    // Loan type shares and within-type denial rates
    const ltMap = loanTypeByGroup?.get(group);
    let ltTotal = 0;
    for (const [, v] of ltMap ?? []) ltTotal += v.denials + v.originations;
    for (const [code, label] of Object.entries(LOAN_TYPE_LABELS)) {
      const v = ltMap?.get(code) ?? { denials: 0, originations: 0 };
      const nLt = v.denials + v.originations;
      f[`share_${label.toLowerCase()}`] = ltTotal > 0 ? nLt / ltTotal : 0;
      if (nLt >= 5) {
        f[`denial_rate_${label.toLowerCase()}`] = v.denials / nLt;
      }
    }

    // Loan purpose shares
    if (loanPurposeByGroup) {
      const lpMap = loanPurposeByGroup.get(group);
      let lpTotal = 0;
      for (const [, v] of lpMap ?? []) lpTotal += v.denials + v.originations;
      for (const [code, label] of Object.entries(LOAN_PURPOSE_LABELS)) {
        const v = lpMap?.get(code) ?? { denials: 0, originations: 0 };
        const slug = label.toLowerCase().replace(/[\s\-\/]+/g, "_").replace(/[^a-z0-9_]/g, "");
        f[`share_${slug}`] = lpTotal > 0 ? (v.denials + v.originations) / lpTotal : 0;
      }
    }

    // Occupancy shares
    if (occupancyByGroup) {
      const occMap = occupancyByGroup.get(group);
      let occTotal = 0;
      for (const [, v] of occMap ?? []) occTotal += v.denials + v.originations;
      const OCCUPANCY_LABELS: Record<string, string> = {
        "1": "principal",
        "2": "second_home",
        "3": "investment",
      };
      for (const [code, slug] of Object.entries(OCCUPANCY_LABELS)) {
        const v = occMap?.get(code) ?? { denials: 0, originations: 0 };
        f[`share_${slug}`] = occTotal > 0 ? (v.denials + v.originations) / occTotal : 0;
      }
    }

    groups.push({ group, label: RACE_LABELS[group] ?? group, features: f, applications: n });
  }

  return groups;
}

// ─── Public types ─────────────────────────────────────────────────────────────

/** Input data sources (all from HMDA aggregation API) */
export interface DecompositionInput {
  /** race × action_taken aggregation */
  overall: AggregationResponse;
  /** race × loan_type × action_taken aggregation */
  loanType: AggregationResponse;
  /** race × loan_purpose × action_taken aggregation (optional) */
  loanPurpose?: AggregationResponse | null;
  /** race × occupancy_type × action_taken aggregation (optional) */
  occupancy?: AggregationResponse | null;
}

export interface VarianceDecompositionResult {
  /**
   * PCA of the racial-group × feature matrix.
   * Null when fewer than 3 groups have sufficient data (PCA not meaningful).
   */
  pca: PCAResult | null;

  /** Feature matrix sent to PCA (groups as observations) */
  featureMatrix: {
    groups: string[];   // observation labels (racial group labels)
    features: string[]; // feature names
    data: Matrix;       // groups.length × features.length
  };

  /** KBO decomposition per minority group (vs. White baseline) */
  kbo: KBODecomposition[];

  /**
   * Aggregate KBO across all minority groups (applications-weighted average).
   * Gives a single "lender-level" split between impact and treatment evidence.
   */
  aggregateCompositionFraction: number;
  aggregateTreatmentFraction: number;

  /**
   * Which features show the strongest loading on the first two PCs
   * (sorted by |loading| descending on PC1).
   */
  pc1TopFeatures: { feature: string; loading: number }[];
  pc2TopFeatures: { feature: string; loading: number }[];

  /** Which strata were available for KBO decomposition */
  kboStrata: string[];
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute the full variance decomposition for a single lender.
 *
 * @param input   Data sources (five HMDA API response objects)
 * @returns       PCA result + KBO decomposition + aggregate summary
 */
export function computeVarianceDecomposition(
  input: DecompositionInput
): VarianceDecompositionResult {
  // ── 1. Collapse raw data ───────────────────────────────────────────────────
  const overallByGroup = collapseByGroup(input.overall, "races");

  const loanTypeByGroup = collapseByGroupAndStratum(
    input.loanType,
    "races",
    "loan_types"
  );

  const loanPurposeByGroup = input.loanPurpose
    ? collapseByGroupAndStratum(input.loanPurpose, "races", "loan_purposes")
    : null;

  const occupancyByGroup = input.occupancy
    ? collapseByGroupAndStratum(input.occupancy, "races", "occupancy_types")
    : null;

  // ── 2. Build per-group feature vectors ────────────────────────────────────
  const groupFeatures = buildGroupFeatures(
    overallByGroup,
    loanTypeByGroup,
    loanPurposeByGroup,
    occupancyByGroup
  );

  // ── 3. KBO decomposition for each minority group vs. White ─────────────────
  const whiteOverall = overallByGroup.get("White") ?? { denials: 0, originations: 0 };
  const whiteN = whiteOverall.denials + whiteOverall.originations;
  const whiteDenialRate = whiteN > 0 ? whiteOverall.denials / whiteN : 0;
  const whiteLoanTypeMap = loanTypeByGroup.get("White") ?? new Map();

  const kbo: KBODecomposition[] = [];

  for (const gf of groupFeatures) {
    if (gf.group === "White") continue;

    const gOverall = overallByGroup.get(gf.group) ?? { denials: 0, originations: 0 };
    const gN = gOverall.denials + gOverall.originations;
    const gRate = gN > 0 ? gOverall.denials / gN : 0;

    const gLoanTypeMap = loanTypeByGroup.get(gf.group) ?? new Map();

    const partial = computeKBOForGroup(
      gf.group,
      gLoanTypeMap,
      whiteLoanTypeMap,
      LOAN_TYPE_LABELS
    );

    kbo.push({
      ...partial,
      label: gf.label,
      rawDenialRate: gRate,
      whiteDenialRate,
      rawGap: gRate - whiteDenialRate,
    });
  }

  // ── 4. Aggregate KBO (application-weighted) ───────────────────────────────
  let totalApps = 0;
  let weightedComp = 0;
  let weightedTreat = 0;

  for (const k of kbo) {
    const n = overallByGroup.get(k.group);
    const apps = n ? n.denials + n.originations : 0;
    const absGap = Math.abs(k.rawGap);
    if (absGap < 1e-6) continue;
    totalApps += apps;
    weightedComp += k.compositionFraction * apps;
    weightedTreat += k.treatmentFraction * apps;
  }

  const aggregateCompositionFraction =
    totalApps > 0 ? weightedComp / totalApps : 0;
  const aggregateTreatmentFraction =
    totalApps > 0 ? weightedTreat / totalApps : 0;

  // ── 5. Assemble feature matrix for PCA ────────────────────────────────────
  // Use only features present for ALL groups (no imputation — small matrix)
  const allFeatureKeys = groupFeatures.length > 0
    ? Object.keys(groupFeatures[0].features)
    : [];

  const validFeatureKeys = allFeatureKeys.filter((k) =>
    groupFeatures.every((gf) => k in gf.features && isFinite(gf.features[k]))
  );

  const observationLabels = groupFeatures.map((gf) => gf.label);
  const data: Matrix = groupFeatures.map((gf) =>
    validFeatureKeys.map((k) => gf.features[k])
  );

  // ── 6. PCA (requires ≥ 3 groups and ≥ 2 features) ─────────────────────────
  let pca: PCAResult | null = null;
  let pc1TopFeatures: { feature: string; loading: number }[] = [];
  let pc2TopFeatures: { feature: string; loading: number }[] = [];

  if (groupFeatures.length >= 3 && validFeatureKeys.length >= 2) {
    try {
      pca = runPCA(data, validFeatureKeys, observationLabels);

      // Top features driving PC1 and PC2 (sorted by absolute loading)
      const sortedByPc1 = validFeatureKeys
        .map((feat, j) => ({ feature: feat, loading: pca!.loadings[j][0] }))
        .sort((a, b) => Math.abs(b.loading) - Math.abs(a.loading))
        .slice(0, 5);
      pc1TopFeatures = sortedByPc1;

      if (pca.nComponents >= 2) {
        const sortedByPc2 = validFeatureKeys
          .map((feat, j) => ({ feature: feat, loading: pca!.loadings[j][1] }))
          .sort((a, b) => Math.abs(b.loading) - Math.abs(a.loading))
          .slice(0, 5);
        pc2TopFeatures = sortedByPc2;
      }
    } catch {
      pca = null;
    }
  }

  return {
    pca,
    featureMatrix: { groups: observationLabels, features: validFeatureKeys, data },
    kbo,
    aggregateCompositionFraction,
    aggregateTreatmentFraction,
    pc1TopFeatures,
    pc2TopFeatures,
    kboStrata: ["Conventional", "FHA", "VA", "USDA"],
  };
}
