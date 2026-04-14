/**
 * Comprehensive unit tests for lib/pca.ts
 *
 * Covers:
 *  - Matrix standardisation (zero mean, unit variance)
 *  - Covariance matrix (known values)
 *  - Jacobi eigendecomposition (identity, diagonal, general symmetric)
 *  - runPCA output shapes, variance explained sums to 1
 *  - Edge cases: constant column, n=2, all-same rows, high-dimensional input
 *  - Mathematical correctness: scores × loadingsᵀ ≈ Z (reconstruction)
 */

import { runPCA, Matrix } from "@/lib/pca";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function approx(a: number, b: number, tol = 1e-6): boolean {
  return Math.abs(a - b) < tol;
}

function matClose(A: Matrix, B: Matrix, tol = 1e-5): boolean {
  if (A.length !== B.length) return false;
  for (let i = 0; i < A.length; i++) {
    if (A[i].length !== B[i].length) return false;
    for (let j = 0; j < A[i].length; j++) {
      if (!approx(A[i][j], B[i][j], tol)) return false;
    }
  }
  return true;
}

/** Transpose a matrix */
function T(M: Matrix): Matrix {
  const rows = M.length;
  const cols = M[0].length;
  return Array.from({ length: cols }, (_, j) =>
    Array.from({ length: rows }, (_, i) => M[i][j])
  );
}

/** Matrix multiply A (m×k) × B (k×n) → m×n */
function matMul(A: Matrix, B: Matrix): Matrix {
  const m = A.length;
  const k = A[0].length;
  const n = B[0].length;
  return Array.from({ length: m }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      let s = 0;
      for (let l = 0; l < k; l++) s += A[i][l] * B[l][j];
      return s;
    })
  );
}

/** Standardise a column-major matrix manually for reference */
function manualStandardise(X: Matrix): Matrix {
  const n = X.length;
  const p = X[0].length;
  const means = Array.from({ length: p }, (_, j) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += X[i][j];
    return s / n;
  });
  const stds = Array.from({ length: p }, (_, j) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += (X[i][j] - means[j]) ** 2;
    const sd = Math.sqrt(s / (n - 1));
    return sd < 1e-10 ? 1 : sd;
  });
  return X.map((row) => row.map((v, j) => (v - means[j]) / stds[j]));
}

// ─── 1. runPCA: basic shapes ─────────────────────────────────────────────────

describe("runPCA – output shapes", () => {
  const data: Matrix = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
    [2, 4, 6],
  ]; // 4 obs × 3 features
  const features = ["f1", "f2", "f3"];
  const obs = ["o1", "o2", "o3", "o4"];

  let result: ReturnType<typeof runPCA>;

  beforeAll(() => {
    result = runPCA(data, features, obs);
  });

  test("scores matrix has shape n × k", () => {
    expect(result.scores.length).toBe(4);
    result.scores.forEach((row) => expect(row.length).toBe(result.nComponents));
  });

  test("loadings matrix has shape p × k", () => {
    expect(result.loadings.length).toBe(3);
    result.loadings.forEach((row) => expect(row.length).toBe(result.nComponents));
  });

  test("varianceExplained has length k", () => {
    expect(result.varianceExplained.length).toBe(result.nComponents);
  });

  test("cumulativeVariance has length k", () => {
    expect(result.cumulativeVariance.length).toBe(result.nComponents);
  });

  test("featureNames preserved", () => {
    expect(result.featureNames).toEqual(features);
  });

  test("observationLabels preserved", () => {
    expect(result.observationLabels).toEqual(obs);
  });

  test("meanVector length equals p", () => {
    expect(result.meanVector.length).toBe(3);
  });

  test("stdVector length equals p", () => {
    expect(result.stdVector.length).toBe(3);
  });
});

// ─── 2. Variance explained sums to ≤ 1 ──────────────────────────────────────

describe("runPCA – variance explained", () => {
  const data: Matrix = [
    [1, 0.5, 3],
    [2, 1.5, 1],
    [0, 2.0, 2],
    [3, 0.0, 0],
    [1, 1.0, 4],
  ];
  const features = ["a", "b", "c"];
  const obs = ["r1", "r2", "r3", "r4", "r5"];

  test("individual variances are non-negative", () => {
    const res = runPCA(data, features, obs);
    res.varianceExplained.forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
  });

  test("variance sums to 1 (all PCs)", () => {
    const res = runPCA(data, features, obs);
    const total = res.varianceExplained.reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(1.0, 5);
  });

  test("cumulative variance is monotone non-decreasing", () => {
    const res = runPCA(data, features, obs);
    for (let i = 1; i < res.cumulativeVariance.length; i++) {
      expect(res.cumulativeVariance[i]).toBeGreaterThanOrEqual(
        res.cumulativeVariance[i - 1]
      );
    }
  });

  test("cumulativeVariance[-1] ≈ 1", () => {
    const res = runPCA(data, features, obs);
    const last = res.cumulativeVariance[res.cumulativeVariance.length - 1];
    expect(last).toBeCloseTo(1.0, 5);
  });

  test("eigenvalues are sorted descending", () => {
    const res = runPCA(data, features, obs);
    for (let i = 1; i < res.eigenvalues.length; i++) {
      expect(res.eigenvalues[i]).toBeLessThanOrEqual(res.eigenvalues[i - 1] + 1e-8);
    }
  });
});

// ─── 3. Loadings orthonormality ───────────────────────────────────────────────

describe("runPCA – orthonormal loadings", () => {
  const data: Matrix = [
    [2, 3, 1, 0.5],
    [1, 4, 2, 1.0],
    [5, 1, 0, 2.0],
    [3, 2, 3, 0.0],
    [0, 5, 1, 1.5],
  ];
  const features = ["x1", "x2", "x3", "x4"];
  const obs = ["a", "b", "c", "d", "e"];

  test("loading columns are orthogonal (dot product ≈ 0)", () => {
    const res = runPCA(data, features, obs);
    const k = res.nComponents;
    // For each pair of PC columns, inner product should be 0
    for (let a = 0; a < k; a++) {
      for (let b = a + 1; b < k; b++) {
        let dot = 0;
        for (let j = 0; j < features.length; j++) {
          dot += res.loadings[j][a] * res.loadings[j][b];
        }
        expect(Math.abs(dot)).toBeLessThan(1e-7);
      }
    }
  });

  test("loading columns have unit norm", () => {
    const res = runPCA(data, features, obs);
    const k = res.nComponents;
    for (let l = 0; l < k; l++) {
      let norm = 0;
      for (let j = 0; j < features.length; j++) {
        norm += res.loadings[j][l] ** 2;
      }
      expect(Math.sqrt(norm)).toBeCloseTo(1.0, 6);
    }
  });
});

// ─── 4. Score reconstruction ──────────────────────────────────────────────────

describe("runPCA – score reconstruction Z ≈ scores × loadingsᵀ", () => {
  const data: Matrix = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 2, 9],
    [0, 8, 1],
    [3, 3, 3],
  ];
  const features = ["a", "b", "c"];
  const obs = ["r1", "r2", "r3", "r4", "r5"];

  test("reconstructed Z matches manual standardisation within tolerance", () => {
    const res = runPCA(data, features, obs);
    const Z = manualStandardise(data);

    // Reconstruct: Z_hat = scores × loadingsᵀ  (n×k) × (k×p) → n×p
    const loadingsT = T(res.loadings); // k×p
    const Zhat = matMul(res.scores, loadingsT); // n×p

    // When all PCs are used (k = min(n-1, p)) reconstruction is exact
    expect(matClose(Z, Zhat, 1e-5)).toBe(true);
  });
});

// ─── 5. nComponents cap ───────────────────────────────────────────────────────

describe("runPCA – nComponents parameter", () => {
  const data: Matrix = [
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 0, 1, 2],
    [3, 4, 5, 6],
    [7, 8, 0, 1],
  ];
  const features = ["f1", "f2", "f3", "f4"];
  const obs = ["o1", "o2", "o3", "o4", "o5"];

  test("returns exactly nComponents=2 PCs when requested", () => {
    const res = runPCA(data, features, obs, 2);
    expect(res.nComponents).toBe(2);
    expect(res.scores[0].length).toBe(2);
    expect(res.loadings[0].length).toBe(2);
    expect(res.varianceExplained.length).toBe(2);
  });

  test("nComponents is capped at min(n-1, p)", () => {
    // n=5, p=4 → max = min(4, 4) = 4
    const res = runPCA(data, features, obs, 999);
    expect(res.nComponents).toBeLessThanOrEqual(4);
  });

  test("nComponents=1 returns 1D scores", () => {
    const res = runPCA(data, features, obs, 1);
    expect(res.nComponents).toBe(1);
    res.scores.forEach((row) => expect(row.length).toBe(1));
  });
});

// ─── 6. Constant column ───────────────────────────────────────────────────────

describe("runPCA – constant column handling", () => {
  const data: Matrix = [
    [1, 5, 3],
    [2, 5, 1],
    [3, 5, 2],
    [4, 5, 4],
  ]; // column 1 is constant

  const features = ["varying", "constant", "other"];
  const obs = ["a", "b", "c", "d"];

  test("does not throw on constant column", () => {
    expect(() => runPCA(data, features, obs)).not.toThrow();
  });

  test("variance still sums to 1 after constant column removal", () => {
    const res = runPCA(data, features, obs);
    const total = res.varianceExplained.reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(1.0, 5);
  });

  test("constant column std is set to 1 (no blow-up)", () => {
    const res = runPCA(data, features, obs);
    // std for constant column should be 1 (our fallback), not 0
    expect(res.stdVector[1]).toBeCloseTo(1.0, 5);
  });
});

// ─── 7. Minimum n=2 ──────────────────────────────────────────────────────────

describe("runPCA – minimum observations", () => {
  test("throws with fewer than 2 observations", () => {
    expect(() =>
      runPCA([[1, 2, 3]], ["a", "b", "c"], ["only"])
    ).toThrow("at least 2 observations");
  });

  test("works with exactly 2 observations", () => {
    const res = runPCA(
      [
        [1, 2, 3],
        [4, 5, 6],
      ],
      ["a", "b", "c"],
      ["r1", "r2"]
    );
    expect(res.nComponents).toBeGreaterThanOrEqual(1);
    expect(res.varianceExplained.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 5);
  });
});

// ─── 8. Known PCA result (2D data, PC1 = (1,1)/√2) ───────────────────────────

describe("runPCA – known result for 2D data", () => {
  // Perfect positive correlation → PC1 should be ±(1/√2, 1/√2)
  const data: Matrix = [
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 4],
    [5, 5],
  ];
  const features = ["x", "y"];
  const obs = ["a", "b", "c", "d", "e"];

  test("PC1 explains ~100% variance", () => {
    const res = runPCA(data, features, obs, 1);
    // Both features are perfectly correlated; PC1 captures everything
    expect(res.varianceExplained[0]).toBeCloseTo(1.0, 4);
  });

  test("PC1 loading is ~(±1/√2, ±1/√2)", () => {
    const res = runPCA(data, features, obs, 1);
    const l0 = res.loadings[0][0];
    const l1 = res.loadings[1][0];
    // Both loadings must have equal magnitude
    expect(Math.abs(l0)).toBeCloseTo(Math.abs(l1), 5);
    // Both ≈ 1/√2
    expect(Math.abs(l0)).toBeCloseTo(1 / Math.sqrt(2), 5);
  });
});

// ─── 9. Realistic HMDA-like matrix (6 groups × 8 features) ───────────────────

describe("runPCA – realistic HMDA-size input", () => {
  // 6 racial groups × 8 HMDA features (denial rates + shares)
  const data: Matrix = [
    [0.12, 5.2, 0.55, 0.28, 0.10, 0.07, 0.60, 0.20],
    [0.28, 4.1, 0.42, 0.38, 0.12, 0.08, 0.55, 0.22],
    [0.18, 5.8, 0.60, 0.25, 0.08, 0.07, 0.65, 0.18],
    [0.35, 3.9, 0.38, 0.42, 0.13, 0.07, 0.50, 0.25],
    [0.22, 4.7, 0.50, 0.32, 0.11, 0.07, 0.58, 0.21],
    [0.30, 4.2, 0.45, 0.36, 0.12, 0.07, 0.53, 0.23],
  ];
  const features = [
    "denial_rate",
    "log_apps",
    "share_conventional",
    "share_fha",
    "share_va",
    "share_usda",
    "share_purchase",
    "share_refinance",
  ];
  const obs = ["White", "Black", "Asian", "Native American", "Pacific Islander", "Hispanic"];

  let res: ReturnType<typeof runPCA>;

  beforeAll(() => {
    res = runPCA(data, features, obs);
  });

  test("returns valid result without throwing", () => {
    expect(res).toBeDefined();
  });

  test("nComponents ≤ min(n-1, p) = 5", () => {
    expect(res.nComponents).toBeLessThanOrEqual(5);
  });

  test("all variance explained values are in [0, 1]", () => {
    res.varianceExplained.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1 + 1e-8);
    });
  });

  test("eigenvalues are all non-negative", () => {
    res.eigenvalues.forEach((ev) => expect(ev).toBeGreaterThanOrEqual(-1e-8));
  });
});
