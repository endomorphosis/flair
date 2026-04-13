/**
 * Statistical tests and confidence intervals for fair lending analysis.
 *
 * All computations are self-contained (no external statistical libraries).
 * Methods used are standard regulatory and academic practice:
 *   - Log-ratio delta method CIs (Fieller / Katz 1978)
 *   - Yates-corrected chi-square for 2×2 tables
 *   - Cochran-Mantel-Haenszel stratified test (Mantel & Haenszel 1959)
 *   - Two-proportion z-test power formula for MDE
 */

// ─── Normal distribution helpers ─────────────────────────────────────────────

/**
 * Standard normal CDF Φ(z) via Hart (1968) rational approximation.
 * Accurate to ~7 decimal places.
 */
function normalCDF(z: number): number {
  if (z < -8) return 0;
  if (z > 8) return 1;
  const b = [
    0.2316419, 0.319381530, -0.356563782,
    1.781477937, -1.821255978, 1.330274429,
  ];
  const t = 1 / (1 + b[0] * Math.abs(z));
  const poly =
    t * (b[1] + t * (b[2] + t * (b[3] + t * (b[4] + t * b[5]))));
  const pdf = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const p = 1 - pdf * poly;
  return z >= 0 ? p : 1 - p;
}

/** Survival function 1-Φ(z) */
function normalSF(z: number): number {
  return 1 - normalCDF(z);
}

// ─── Chi-square p-value via Wilson-Hilferty ───────────────────────────────────

/**
 * Chi-square survival function P(χ² > x | df) using the Wilson-Hilferty
 * cube-root normal approximation.  Accurate to ≲0.01 for df≥1, x>0.
 */
export function chiSquareSF(x: number, df: number): number {
  if (x <= 0) return 1;
  // Wilson-Hilferty: (χ²/df)^(1/3) ≈ N(μ, σ²)
  const mu = 1 - 2 / (9 * df);
  const sigma = Math.sqrt(2 / (9 * df));
  const z = (Math.pow(x / df, 1 / 3) - mu) / sigma;
  return normalSF(z);
}

// ─── Confidence interval for a disparity ratio ───────────────────────────────

/** Two-sided confidence interval for a disparity ratio (lower and upper bounds). */
export interface ConfidenceInterval {
  /** Lower bound of the confidence interval for the disparity ratio */
  lower: number;
  /** Upper bound of the confidence interval for the disparity ratio */
  upper: number;
}

/**
 * 95% confidence interval for the disparity ratio p₁/p₂ using the log-ratio
 * delta method (Katz et al. 1978).
 *
 * Var(log(p̂₁/p̂₂)) ≈ (1−p₁)/(n₁·p₁) + (1−p₂)/(n₂·p₂)
 *
 * @param denials1  Denials for the minority group
 * @param n1        Total applications for the minority group
 * @param denials2  Denials for the baseline (White) group
 * @param n2        Total applications for the baseline group
 * @param z         z-critical value (default 1.96 for 95%)
 */
export function computeDisparityCI(
  denials1: number,
  n1: number,
  denials2: number,
  n2: number,
  z = 1.96
): ConfidenceInterval | null {
  if (denials1 <= 0 || denials2 <= 0 || n1 < 5 || n2 < 5) return null;
  const p1 = denials1 / n1;
  const p2 = denials2 / n2;
  if (p1 <= 0 || p2 <= 0) return null;
  const varLogRatio = (1 - p1) / (n1 * p1) + (1 - p2) / (n2 * p2);
  const seLogRatio = Math.sqrt(varLogRatio);
  const logRatio = Math.log(p1 / p2);
  return {
    lower: Math.exp(logRatio - z * seLogRatio),
    upper: Math.exp(logRatio + z * seLogRatio),
  };
}

// ─── Chi-square test of independence (2×2) ────────────────────────────────────

export interface ChiSquareResult {
  statistic: number;
  pValue: number;
  /** p < 0.05 */
  significant: boolean;
  /** True when any expected cell count < 5 (chi-square approximation is poor) */
  smallCellWarning: boolean;
}

/**
 * Chi-square test of independence for a 2×2 contingency table.
 * Uses Yates continuity correction.
 *
 * Table layout:
 *   | Denied | Approved | Total
 * G |   a    |    b     | a+b
 * W |   c    |    d     | c+d
 *   | a+c    |  b+d     |  N
 *
 * @param a  Minority denials
 * @param b  Minority originations
 * @param c  White denials
 * @param d  White originations
 */
export function chiSquareTest(
  a: number,
  b: number,
  c: number,
  d: number
): ChiSquareResult {
  const n = a + b + c + d;
  if (n === 0 || (a + b) === 0 || (c + d) === 0 || (a + c) === 0 || (b + d) === 0) {
    return { statistic: 0, pValue: 1, significant: false, smallCellWarning: true };
  }

  // Expected values for small-cell warning
  const e_a = ((a + b) * (a + c)) / n;
  const e_b = ((a + b) * (b + d)) / n;
  const e_c = ((c + d) * (a + c)) / n;
  const e_d = ((c + d) * (b + d)) / n;
  const smallCellWarning = [e_a, e_b, e_c, e_d].some((e) => e < 5);

  // Yates-corrected chi-square
  const num = n * Math.pow(Math.max(0, Math.abs(a * d - b * c) - n / 2), 2);
  const den = (a + b) * (c + d) * (a + c) * (b + d);
  if (den === 0) return { statistic: 0, pValue: 1, significant: false, smallCellWarning };

  const statistic = num / den;
  const pValue = chiSquareSF(statistic, 1);
  return { statistic, pValue, significant: pValue < 0.05, smallCellWarning };
}

// ─── Cochran-Mantel-Haenszel stratified test ─────────────────────────────────

export interface CMHStratum {
  /** Minority group denials in this stratum */
  a: number;
  /** Minority group originations in this stratum */
  b: number;
  /** White group denials in this stratum */
  c: number;
  /** White group originations in this stratum */
  d: number;
  /** Human-readable label for this stratum */
  label: string;
}

export interface CMHResult {
  /** CMH chi-square statistic (1 df) */
  statistic: number;
  pValue: number;
  /** p < 0.05 */
  significant: boolean;
  /** Number of strata that met the minimum-cell requirement (≥5 expected in each cell) */
  strataN: number;
  /** Number of strata excluded due to insufficient data */
  strataExcluded: number;
  /** Common odds-ratio estimate (Mantel-Haenszel weighted) */
  commonOddsRatio: number | null;
}

/**
 * Cochran-Mantel-Haenszel test of conditional independence across K strata.
 * Tests the null hypothesis that the association between race and denial is
 * zero in every stratum simultaneously, after controlling for stratum membership.
 *
 * Uses continuity-corrected version per Mantel (1963).
 * Strata with any expected cell < 5 are excluded from the pool.
 */
export function cochranMantelHaenszel(strata: CMHStratum[]): CMHResult {
  let numeratorSum = 0;
  let varianceSum = 0;
  let mhNumOdds = 0;
  let mhDenOdds = 0;
  let strataN = 0;
  let strataExcluded = 0;

  for (const s of strata) {
    const n = s.a + s.b + s.c + s.d;
    if (n < 10) { strataExcluded++; continue; }

    // Expected value of a under H0
    const E_a = ((s.a + s.b) * (s.a + s.c)) / n;
    const e_b = ((s.a + s.b) * (s.b + s.d)) / n;
    const e_c = ((s.c + s.d) * (s.a + s.c)) / n;
    const e_d = ((s.c + s.d) * (s.b + s.d)) / n;

    if ([E_a, e_b, e_c, e_d].some((e) => e < 5)) {
      strataExcluded++;
      continue;
    }

    numeratorSum += s.a - E_a;
    const V =
      ((s.a + s.b) * (s.c + s.d) * (s.a + s.c) * (s.b + s.d)) /
      (n * n * (n - 1));
    varianceSum += V;

    // Mantel-Haenszel common odds-ratio components
    mhNumOdds += (s.a * s.d) / n;
    mhDenOdds += (s.b * s.c) / n;
    strataN++;
  }

  if (strataN === 0 || varianceSum === 0) {
    return {
      statistic: 0,
      pValue: 1,
      significant: false,
      strataN: 0,
      strataExcluded,
      commonOddsRatio: null,
    };
  }

  // Continuity-corrected statistic
  const statistic =
    Math.pow(Math.max(0, Math.abs(numeratorSum) - 0.5), 2) / varianceSum;
  const pValue = chiSquareSF(statistic, 1);
  const commonOddsRatio =
    mhDenOdds > 0 ? mhNumOdds / mhDenOdds : null;

  return {
    statistic,
    pValue,
    significant: pValue < 0.05,
    strataN,
    strataExcluded,
    commonOddsRatio,
  };
}

// ─── Power analysis / minimum detectable effect ──────────────────────────────

export interface PowerAnalysis {
  /** Minimum ratio (p1/p2) detectable at 80% power, 95% confidence (two-sided) */
  minimumDetectableRatio: number;
  nMinority: number;
  nWhite: number;
  baselineDenialRate: number;
  /** Whether the sample is adequate to detect a ratio ≥ 1.5 at stated power */
  adequateFor1_5: boolean;
  /** Whether the sample is adequate to detect a ratio ≥ 2.0 at stated power */
  adequateFor2_0: boolean;
}

/**
 * Minimum detectable disparity ratio at 80% power and 95% two-sided confidence.
 * Uses the two-proportion z-test formula.
 *
 * Under H0 both groups have p₀ (White denial rate).
 * δ_min = (z_α/2 + z_β) × √(p₀(1−p₀)(1/n₁ + 1/n₂))
 * MDE ratio = (p₀ + δ_min) / p₀
 *
 * @param nMinority  Applications in the minority group
 * @param nWhite     Applications in the White baseline group
 * @param p0         White (baseline) denial rate
 */
export function minimumDetectableRatio(
  nMinority: number,
  nWhite: number,
  p0: number
): PowerAnalysis {
  const sentinel: PowerAnalysis = {
    minimumDetectableRatio: Infinity,
    nMinority,
    nWhite,
    baselineDenialRate: p0,
    adequateFor1_5: false,
    adequateFor2_0: false,
  };
  if (nMinority < 5 || nWhite < 5 || p0 <= 0 || p0 >= 1) return sentinel;

  const z_alpha = 1.96; // 95% CI two-sided (α=0.05)
  const z_beta = 0.842; // z_β: P(Z ≤ z_β) = 0.80 (80% power, i.e. 20% Type II error rate)
  const q0 = 1 - p0;
  const delta = (z_alpha + z_beta) * Math.sqrt(p0 * q0 * (1 / nMinority + 1 / nWhite));
  const p1_min = p0 + delta;

  if (p1_min >= 1) return sentinel;

  const mdr = p1_min / p0;
  return {
    minimumDetectableRatio: mdr,
    nMinority,
    nWhite,
    baselineDenialRate: p0,
    adequateFor1_5: mdr <= 1.5,
    adequateFor2_0: mdr <= 2.0,
  };
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

/** Format a p-value for display: "<0.001", "0.023", etc. */
export function formatPValue(p: number): string {
  if (p < 0.001) return "<0.001";
  if (p < 0.01) return p.toFixed(3);
  return p.toFixed(2);
}
