/**
 * Principal Component Analysis — pure TypeScript implementation.
 *
 * Uses the Jacobi iterative eigendecomposition for symmetric covariance
 * matrices.  Suitable for the small matrices encountered in HMDA variance
 * analysis (typically 5-6 racial groups × 8-15 features, or the transpose).
 *
 * References:
 *   Golub & Van Loan, "Matrix Computations", 4th ed., §8.5 (Jacobi method)
 *   Jolliffe, "Principal Component Analysis", 2nd ed. (Springer, 2002)
 */

// ─── Matrix type and utilities ────────────────────────────────────────────────

export type Matrix = number[][];

function identity(n: number): Matrix {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );
}

// ─── Standardisation ──────────────────────────────────────────────────────────

/**
 * Standardise each column of X to zero mean and unit variance (sample
 * standard deviation, denominator n−1).  Constant columns (std ≈ 0) are
 * left on their mean without scaling so they don't blow up the covariance
 * matrix.
 */
function standardise(X: Matrix): {
  Z: Matrix;
  means: number[];
  stds: number[];
} {
  const n = X.length;
  const p = X[0].length;
  const means = new Array<number>(p).fill(0);
  const stds = new Array<number>(p).fill(1);

  for (let j = 0; j < p; j++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += X[i][j];
    means[j] = sum / n;
  }

  for (let j = 0; j < p; j++) {
    let sumSq = 0;
    for (let i = 0; i < n; i++) sumSq += (X[i][j] - means[j]) ** 2;
    const sd = n > 1 ? Math.sqrt(sumSq / (n - 1)) : 0;
    stds[j] = sd < 1e-10 ? 1 : sd;
  }

  const Z: Matrix = Array.from({ length: n }, (_, i) =>
    Array.from({ length: p }, (_, j) => (X[i][j] - means[j]) / stds[j])
  );
  return { Z, means, stds };
}

// ─── Covariance matrix ────────────────────────────────────────────────────────

function covarianceMatrix(Z: Matrix): Matrix {
  const n = Z.length;
  const p = Z[0].length;
  const C: Matrix = Array.from({ length: p }, () =>
    new Array<number>(p).fill(0)
  );
  for (let i = 0; i < p; i++) {
    for (let j = i; j < p; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) sum += Z[k][i] * Z[k][j];
      C[i][j] = n > 1 ? sum / (n - 1) : 0;
      C[j][i] = C[i][j]; // symmetric
    }
  }
  return C;
}

// ─── Jacobi eigendecomposition ────────────────────────────────────────────────

/**
 * Eigendecomposition of a symmetric p×p matrix via Jacobi iteration.
 *
 * Returns eigenvalues sorted in descending order and corresponding eigenvectors
 * stored as *columns* of the output matrix (p×p).  Negative eigenvalues
 * produced by floating-point rounding are clamped to zero.
 */
function jacobiEigen(
  A: Matrix,
  tol = 1e-12
): { values: number[]; vectors: Matrix } {
  const p = A.length;
  const M: Matrix = A.map((row) => [...row]); // deep copy
  const V: Matrix = identity(p);

  const maxIter = Math.max(500, p * p * 20);

  for (let iter = 0; iter < maxIter; iter++) {
    // Find the off-diagonal element with the largest absolute value
    let maxVal = 0;
    let pi = 0;
    let qi = 1;
    for (let i = 0; i < p - 1; i++) {
      for (let j = i + 1; j < p; j++) {
        if (Math.abs(M[i][j]) > maxVal) {
          maxVal = Math.abs(M[i][j]);
          pi = i;
          qi = j;
        }
      }
    }
    if (maxVal < tol) break;

    // Givens rotation angle θ so that the (pi, qi) element is zeroed
    const diff = M[qi][qi] - M[pi][pi];
    const theta =
      Math.abs(diff) < 1e-14
        ? Math.PI / 4
        : 0.5 * Math.atan2(2 * M[pi][qi], diff);
    const c = Math.cos(theta);
    const s = Math.sin(theta);

    // Update the two diagonal entries and zero out (pi, qi)
    const newMpp = c * c * M[pi][pi] - 2 * s * c * M[pi][qi] + s * s * M[qi][qi];
    const newMqq = s * s * M[pi][pi] + 2 * s * c * M[pi][qi] + c * c * M[qi][qi];
    M[pi][pi] = newMpp;
    M[qi][qi] = newMqq;
    M[pi][qi] = 0;
    M[qi][pi] = 0;

    // Update the remaining rows/columns
    for (let r = 0; r < p; r++) {
      if (r !== pi && r !== qi) {
        const mrp = M[r][pi];
        const mrq = M[r][qi];
        M[r][pi] = c * mrp - s * mrq;
        M[pi][r] = M[r][pi];
        M[r][qi] = s * mrp + c * mrq;
        M[qi][r] = M[r][qi];
      }
    }

    // Accumulate eigenvectors (V ← V · G)
    for (let r = 0; r < p; r++) {
      const vrp = V[r][pi];
      const vrq = V[r][qi];
      V[r][pi] = c * vrp - s * vrq;
      V[r][qi] = s * vrp + c * vrq;
    }
  }

  // Sort by descending eigenvalue
  const indices = Array.from({ length: p }, (_, i) => i).sort(
    (a, b) => M[b][b] - M[a][a]
  );

  const values = indices.map((i) => Math.max(0, M[i][i]));
  // Re-order eigenvector columns to match sorted order
  const vectors: Matrix = Array.from({ length: p }, (_, row) =>
    indices.map((col) => V[row][col])
  );

  return { values, vectors };
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface PCAResult {
  /** n × k scores matrix (rows = observations, cols = principal components) */
  scores: Matrix;
  /** p × k loadings matrix (rows = features, cols = PCs) */
  loadings: Matrix;
  /** Variance explained by each PC as a proportion [0, 1] */
  varianceExplained: number[];
  /** Cumulative variance explained */
  cumulativeVariance: number[];
  /** Eigenvalues (proportional to variance captured) */
  eigenvalues: number[];
  /** Column means used for centring (length p) */
  meanVector: number[];
  /** Column standard deviations used for scaling (length p) */
  stdVector: number[];
  /** Feature names (length p) */
  featureNames: string[];
  /** Observation labels (length n) */
  observationLabels: string[];
  /** Number of PCs returned */
  nComponents: number;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run PCA on a data matrix.
 *
 * All features are standardised (mean = 0, std = 1) before computing the
 * covariance matrix — i.e., PCA is performed on the *correlation* matrix,
 * which is appropriate when features live on different scales (proportions,
 * log-counts, rates).
 *
 * @param data               n × p matrix — rows are observations, cols are features
 * @param featureNames       Length-p feature labels
 * @param observationLabels  Length-n observation labels
 * @param nComponents        How many PCs to return (default = min(n−1, p))
 */
export function runPCA(
  data: Matrix,
  featureNames: string[],
  observationLabels: string[],
  nComponents?: number
): PCAResult {
  const n = data.length;
  if (n < 2) throw new Error("PCA requires at least 2 observations");
  const p = featureNames.length;
  const k = Math.min(nComponents ?? Infinity, n - 1, p);

  const { Z, means, stds } = standardise(data);
  const C = covarianceMatrix(Z);
  const { values, vectors } = jacobiEigen(C);

  const totalVariance = values.reduce((s, v) => s + v, 0);

  const varianceExplained = values.slice(0, k).map((v) =>
    totalVariance > 0 ? v / totalVariance : 0
  );

  const cumulativeVariance: number[] = [];
  let cum = 0;
  for (const v of varianceExplained) {
    cum += v;
    cumulativeVariance.push(cum);
  }

  // loadings[feature][pc] = component of eigenvector for that feature
  const loadings: Matrix = Array.from({ length: p }, (_, j) =>
    Array.from({ length: k }, (_, l) => vectors[j][l])
  );

  // scores[obs][pc] = dot product of standardised obs with pc direction
  const scores: Matrix = Array.from({ length: n }, (_, i) =>
    Array.from({ length: k }, (_, l) => {
      let score = 0;
      for (let j = 0; j < p; j++) score += Z[i][j] * loadings[j][l];
      return score;
    })
  );

  return {
    scores,
    loadings,
    varianceExplained,
    cumulativeVariance,
    eigenvalues: values.slice(0, k),
    meanVector: means,
    stdVector: stds,
    featureNames,
    observationLabels,
    nComponents: k,
  };
}
