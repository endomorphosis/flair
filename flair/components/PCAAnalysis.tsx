"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ResponsiveContainer,
  Cell,
  LabelList,
  ReferenceLine,
} from "recharts";
import type {
  VarianceDecompositionResult,
  KBODecomposition,
} from "@/lib/variance-decomposition";

// ─── Colour helpers ───────────────────────────────────────────────────────────

const GROUP_COLORS: Record<string, string> = {
  "African American": "#2563eb",
  Asian: "#16a34a",
  "Native American": "#d97706",
  "Pacific Islander": "#9333ea",
  "Hispanic/Latino": "#dc2626",
  White: "#6b7280",
};

function groupColor(label: string): string {
  return GROUP_COLORS[label] ?? "#64748b";
}

function loadingColor(v: number): string {
  const abs = Math.abs(v);
  if (abs < 0.2) return "#e5e7eb"; // neutral grey
  return v > 0 ? `rgba(37,99,235,${Math.min(abs, 1)})` : `rgba(220,38,38,${Math.min(abs, 1)})`;
}

// ─── Feature label formatter ──────────────────────────────────────────────────

function prettifyFeature(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Scree plot: variance explained per PC */
function ScreePlot({
  varianceExplained,
}: {
  varianceExplained: number[];
}) {
  const data = varianceExplained.map((v, i) => ({
    pc: `PC${i + 1}`,
    variance: parseFloat((v * 100).toFixed(1)),
  }));

  return (
    <div>
      <h3 className="text-[13px] font-semibold text-[#111] mb-3">
        Variance Explained per Principal Component
      </h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="pc" tick={{ fontSize: 11 }} />
          <YAxis
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11 }}
            domain={[0, 100]}
          />
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Tooltip formatter={(v: any) => [`${v}%`, "Variance explained"]} />
          <Bar dataKey="variance" fill="#2563eb" radius={[2, 2, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === 0 ? "#2563eb" : i === 1 ? "#3b82f6" : "#93c5fd"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-[11px] text-neutral-400 mt-1">
        Each bar shows the fraction of total inter-group variance captured by
        that principal component. A steep drop-off (most variance in PC1–PC2)
        indicates a compact structure suitable for 2-D visualisation.
      </p>
    </div>
  );
}

/** Biplot: racial groups in PC1 × PC2 space */
function GroupBiplot({
  scores,
  observationLabels,
}: {
  scores: number[][];
  observationLabels: string[];
}) {
  const data = scores.map((s, i) => ({
    x: parseFloat(s[0].toFixed(3)),
    y: parseFloat((s[1] ?? 0).toFixed(3)),
    label: observationLabels[i],
  }));

  return (
    <div>
      <h3 className="text-[13px] font-semibold text-[#111] mb-1">
        Racial Groups in Principal Component Space (PC1 × PC2)
      </h3>
      <p className="text-[11px] text-neutral-400 mb-3">
        Groups closer together have more similar observable lending profiles.
        White applicants at the origin represent the baseline.
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart margin={{ top: 8, right: 24, left: -8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            type="number"
            dataKey="x"
            name="PC1"
            tick={{ fontSize: 11 }}
            label={{ value: "PC1", position: "insideBottomRight", offset: -4, fontSize: 11 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="PC2"
            tick={{ fontSize: 11 }}
            label={{ value: "PC2", angle: -90, position: "insideLeft", offset: 8, fontSize: 11 }}
          />
          <ReferenceLine x={0} stroke="#d1d5db" strokeDasharray="4 2" />
          <ReferenceLine y={0} stroke="#d1d5db" strokeDasharray="4 2" />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={({ payload }) => {
              if (!payload?.length) return null;
              const d = payload[0].payload as { x: number; y: number; label: string };
              return (
                <div className="bg-white border border-neutral-200 rounded p-2 text-[11px] shadow-sm">
                  <p className="font-semibold text-[#111]">{d.label}</p>
                  <p className="text-neutral-500">PC1: {d.x.toFixed(3)}</p>
                  <p className="text-neutral-500">PC2: {d.y.toFixed(3)}</p>
                </div>
              );
            }}
          />
          <Scatter data={data} fill="#2563eb">
            {data.map((d, i) => (
              <Cell key={i} fill={groupColor(d.label)} />
            ))}
            <LabelList
              dataKey="label"
              position="top"
              style={{ fontSize: 10, fill: "#374151" }}
            />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Loading heatmap: features × first-3 PCs */
function LoadingHeatmap({
  loadings,
  featureNames,
  nPCs,
}: {
  loadings: number[][];
  featureNames: string[];
  nPCs: number;
}) {
  const cols = Math.min(nPCs, 3);

  return (
    <div>
      <h3 className="text-[13px] font-semibold text-[#111] mb-2">
        Feature Loadings on Principal Components
      </h3>
      <p className="text-[11px] text-neutral-400 mb-3">
        Large positive loadings (blue) mean the feature is above average in
        groups that score high on this PC. Large negative (red) = below average.
        Features with high loadings on a PC explain what differentiates the
        groups along that dimension.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="text-left py-1.5 pr-4 font-semibold text-neutral-600 text-[11px]">
                Feature
              </th>
              {Array.from({ length: cols }, (_, l) => (
                <th
                  key={l}
                  className="text-right py-1.5 px-3 font-semibold text-neutral-600 text-[11px]"
                >
                  PC{l + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {featureNames.map((feat, j) => (
              <tr key={feat} className="border-b border-neutral-50">
                <td className="py-1 pr-4 text-neutral-700">
                  {prettifyFeature(feat)}
                </td>
                {Array.from({ length: cols }, (_, l) => {
                  const v = loadings[j]?.[l] ?? 0;
                  return (
                    <td key={l} className="py-1 px-3 text-right tabular-nums">
                      <span
                        className="inline-block rounded px-1.5 py-0.5 font-mono"
                        style={{
                          backgroundColor: loadingColor(v),
                          color: Math.abs(v) > 0.4 ? "white" : "#374151",
                        }}
                      >
                        {v >= 0 ? "+" : ""}{Math.abs(v) < 0.005 ? v.toFixed(3) : v.toFixed(2)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** KBO stacked-bar decomposition: composition vs. treatment effect per group */
function KBOChart({ kbo }: { kbo: KBODecomposition[] }) {
  const hasGap = kbo.some((k) => Math.abs(k.rawGap) > 0.001);
  if (!hasGap) return null;

  const data = kbo
    .filter((k) => Math.abs(k.rawGap) > 0.001)
    .map((k) => ({
      label: k.label,
      composition: parseFloat((k.compositionEffect * 100).toFixed(2)),
      treatment: parseFloat((k.treatmentEffect * 100).toFixed(2)),
      interaction: parseFloat((k.interactionEffect * 100).toFixed(2)),
      raw: parseFloat((k.rawGap * 100).toFixed(2)),
    }));

  return (
    <div>
      <h3 className="text-[13px] font-semibold text-[#111] mb-1">
        Denial-Rate Gap Decomposition (Kitagawa-Blinder-Oaxaca)
      </h3>
      <p className="text-[11px] text-neutral-400 mb-3">
        For each minority group, the raw denial-rate gap vs. White applicants
        is decomposed into a{" "}
        <span className="font-semibold text-blue-700">composition effect</span>{" "}
        (different loan-type mix → disparate impact) and a{" "}
        <span className="font-semibold text-red-700">treatment effect</span>{" "}
        (within the same loan type, different denial rate → disparate
        treatment).  Percentage-point contribution to the overall gap.
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 48, left: 80, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}pp`}
            tick={{ fontSize: 10 }}
          />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={76} />
          <Tooltip
            formatter={(v, name) => {
              const num = typeof v === "number" ? v : 0;
              const nameStr = String(name ?? "");
              return [
                `${num >= 0 ? "+" : ""}${num.toFixed(2)} pp`,
                nameStr === "composition" ? "Composition (disparate impact)"
                : nameStr === "treatment" ? "Treatment (disparate treatment)"
                : "Interaction",
              ] as [string, string];
            }}
          />
          <ReferenceLine x={0} stroke="#374151" />
          <Bar dataKey="composition" stackId="a" fill="#2563eb" name="composition" />
          <Bar dataKey="treatment" stackId="a" fill="#dc2626" name="treatment" />
          <Bar dataKey="interaction" stackId="a" fill="#f59e0b" name="interaction" />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-blue-600 inline-block" />
          Composition effect (disparate impact)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-red-600 inline-block" />
          Treatment effect (disparate treatment)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />
          Interaction
        </span>
      </div>
    </div>
  );
}

/** Per-group KBO breakdown table */
function KBOTable({ kbo }: { kbo: KBODecomposition[] }) {
  return (
    <div>
      <h3 className="text-[13px] font-semibold text-[#111] mb-2">
        Detailed KBO Gap Attribution by Group
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="text-left py-2 pr-4 font-semibold text-neutral-600">Group</th>
              <th className="text-right py-2 px-3 font-semibold text-neutral-600">Raw gap</th>
              <th className="text-right py-2 px-3 font-semibold text-blue-700">Composition</th>
              <th className="text-right py-2 px-3 font-semibold text-red-700">Treatment</th>
              <th className="text-right py-2 px-3 font-semibold text-neutral-500">Interaction</th>
              <th className="text-right py-2 pl-3 font-semibold text-neutral-600">Strata used</th>
            </tr>
          </thead>
          <tbody>
            {kbo.map((k) => {
              const isTreatmentDominant =
                k.strataUsed > 0 &&
                Math.abs(k.treatmentEffect) > Math.abs(k.compositionEffect);
              return (
                <tr
                  key={k.group}
                  className={`border-b border-neutral-100 ${isTreatmentDominant ? "bg-red-50" : ""}`}
                >
                  <td className="py-2 pr-4">
                    <span className="font-medium text-[#111]">{k.label}</span>
                    {isTreatmentDominant && k.strataUsed > 0 && (
                      <span className="ml-2 text-[10px] text-red-700 font-semibold uppercase tracking-wide">
                        treatment-dominant
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums font-medium text-[#111]">
                    {k.rawGap >= 0 ? "+" : ""}
                    {(k.rawGap * 100).toFixed(1)}pp
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-blue-700">
                    {k.strataUsed === 0 ? (
                      <span className="text-neutral-300">n/a</span>
                    ) : (
                      <>
                        {k.compositionEffect >= 0 ? "+" : ""}
                        {(k.compositionEffect * 100).toFixed(1)}pp
                        <br />
                        <span className="text-[10px] text-neutral-400">
                          ({(k.compositionFraction * 100).toFixed(0)}% of gap)
                        </span>
                      </>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-red-700">
                    {k.strataUsed === 0 ? (
                      <span className="text-neutral-300">n/a</span>
                    ) : (
                      <>
                        {k.treatmentEffect >= 0 ? "+" : ""}
                        {(k.treatmentEffect * 100).toFixed(1)}pp
                        <br />
                        <span className="text-[10px] text-neutral-400">
                          ({(k.treatmentFraction * 100).toFixed(0)}% of gap)
                        </span>
                      </>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-neutral-500">
                    {k.strataUsed === 0 ? (
                      <span className="text-neutral-300">n/a</span>
                    ) : (
                      <>
                        {k.interactionEffect >= 0 ? "+" : ""}
                        {(k.interactionEffect * 100).toFixed(1)}pp
                      </>
                    )}
                  </td>
                  <td className="py-2 pl-3 text-right text-neutral-500">
                    {k.strataUsed === 0 ? (
                      <span className="text-orange-500 text-[10px]">⚠ insufficient data</span>
                    ) : (
                      k.strataUsed
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Legal interpretation narrative */
function LegalInterpretation({
  result,
}: {
  result: VarianceDecompositionResult;
}) {
  const compPct = Math.round(result.aggregateCompositionFraction * 100);
  const treatPct = Math.round(result.aggregateTreatmentFraction * 100);

  const dominantTheory =
    Math.abs(result.aggregateTreatmentFraction) >=
    Math.abs(result.aggregateCompositionFraction)
      ? "disparate treatment"
      : "disparate impact";

  const pc1Top = result.pc1TopFeatures[0];
  const pc2Top = result.pc2TopFeatures[0];

  return (
    <div className="border border-neutral-200 rounded-lg p-5 space-y-3 bg-neutral-50">
      <h3 className="text-[13px] font-semibold text-[#111]">
        Statistical Interpretation for Legal Counsel
      </h3>

      {/* Summary paragraph */}
      <p className="text-[12px] text-neutral-700 leading-relaxed">
        Across all racial groups for which sufficient data exist, approximately{" "}
        <strong>{compPct}%</strong> of the raw denial-rate gap vs. White
        applicants is explained by differences in loan-type composition
        (disparate impact), while <strong>{treatPct}%</strong> persists within
        the same loan types (disparate treatment evidence).
      </p>

      {/* Dominant legal theory */}
      <div
        className={`rounded p-3 text-[12px] leading-relaxed ${
          dominantTheory === "disparate treatment"
            ? "bg-red-50 border border-red-200 text-red-900"
            : "bg-blue-50 border border-blue-200 text-blue-900"
        }`}
      >
        <strong>
          {dominantTheory === "disparate treatment"
            ? "Disparate treatment is the dominant signal."
            : "Disparate impact is the dominant signal."}
        </strong>{" "}
        {dominantTheory === "disparate treatment" ? (
          <>
            The majority of the denial-rate gap survives loan-type
            stratification. Under{" "}
            <em>McDonnell Douglas Corp. v. Green</em> and{" "}
            <em>Texas Dept. of Housing v. Inclusive Communities</em>,
            within-stratum gaps after controlling for observable loan
            characteristics shift the burden to the lender to demonstrate a
            legitimate, non-discriminatory reason for the differential.
          </>
        ) : (
          <>
            Most of the gap is attributable to compositional differences in
            loan types applied for. This supports a disparate-impact claim under
            FHA § 3605 if a specific lender policy (e.g., geographic
            underwriting exclusions, product portfolio restrictions) is
            identified as the proximate cause of the composition difference.
          </>
        )}
      </div>

      {/* PCA insight */}
      {result.pca && pc1Top && (
        <p className="text-[12px] text-neutral-600 leading-relaxed">
          PCA identifies{" "}
          <strong>{prettifyFeature(pc1Top.feature)}</strong> as the single
          feature most responsible for differentiating racial groups along the
          primary variance axis (PC1,{" "}
          {(result.pca.varianceExplained[0] * 100).toFixed(0)}% of variance
          explained).
          {pc2Top && result.pca.nComponents >= 2 && (
            <>
              {" "}
              Along the secondary axis (PC2,{" "}
              {(result.pca.varianceExplained[1] * 100).toFixed(0)}%), the
              dominant feature is{" "}
              <strong>{prettifyFeature(pc2Top.feature)}</strong>.
            </>
          )}
        </p>
      )}

      {/* Caveats */}
      <div className="border-t border-neutral-200 pt-3">
        <p className="text-[11px] text-neutral-500 leading-relaxed">
          <strong>Methodological note:</strong> The KBO decomposition is
          computed using loan-type strata only (conventional, FHA, VA, USDA).
          Credit score, full DTI, LTV, appraiser selection, and pricing terms
          are unobservable in HMDA and require FRCP 26/34 production to control
          fully.  A positive treatment effect after loan-type stratification is
          a necessary but not sufficient condition for intentional
          discrimination; it establishes a prima facie statistical case that
          must then be substantiated through discovery.
        </p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  lei: string;
  state?: string;
  msa?: string;
  years: string;
}

export default function PCAAnalysis({ lei, state, msa, years }: Props) {
  const [data, setData] = useState<VarianceDecompositionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lei) return;

    const geoParam = msa ? `msa=${msa}` : `state=${state}`;
    fetch(`/api/pca?lei=${lei}&${geoParam}&years=${years}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
        } else {
          setData(d as VarianceDecompositionResult);
        }
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [lei, state, msa, years]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-5 h-5 border-2 border-neutral-300 border-t-[#111] rounded-full animate-spin" />
        <span className="ml-3 text-sm text-neutral-400">
          Running variance decomposition…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 py-4">
        Variance analysis error: {error}
      </div>
    );
  }

  if (!data) return null;

  const hasKBO = data.kbo.some((k) => Math.abs(k.rawGap) > 0.001);
  const hasPCA = data.pca !== null && data.pca.scores.length >= 3;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-[#111]">
          Variance Decomposition (PCA + KBO)
        </h2>
        <p className="text-[13px] text-neutral-500 mt-1 leading-relaxed max-w-2xl">
          Principal Component Analysis identifies the main axes of variation
          across racial groups in this lender&apos;s data.  The
          Kitagawa-Blinder-Oaxaca decomposition then partitions each group&apos;s
          raw denial-rate gap into a{" "}
          <em>composition effect</em> (disparate impact) and a{" "}
          <em>treatment effect</em> (disparate treatment), using loan type as
          the primary stratification variable.
        </p>
      </div>

      {/* PCA section */}
      {hasPCA && data.pca ? (
        <section className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ScreePlot varianceExplained={data.pca.varianceExplained} />
            <GroupBiplot
              scores={data.pca.scores}
              observationLabels={data.pca.observationLabels}
            />
          </div>
          <LoadingHeatmap
            loadings={data.pca.loadings}
            featureNames={data.pca.featureNames}
            nPCs={data.pca.nComponents}
          />
        </section>
      ) : (
        <div className="text-[12px] text-neutral-400 bg-neutral-50 rounded p-4">
          PCA requires at least 3 racial groups with sufficient data (≥ 10
          applications each).  Not enough groups met the threshold for this
          lender / geography.  The KBO decomposition below is still computed
          from the available groups.
        </div>
      )}

      {/* KBO section */}
      {hasKBO ? (
        <section className="space-y-8">
          <KBOChart kbo={data.kbo} />
          <KBOTable kbo={data.kbo} />
        </section>
      ) : (
        <div className="text-[12px] text-neutral-400 bg-neutral-50 rounded p-4">
          No significant denial-rate gap detected between any minority group and
          White applicants.  The KBO decomposition is not applicable.
        </div>
      )}

      {/* Legal interpretation */}
      {(hasKBO || hasPCA) && <LegalInterpretation result={data} />}

      {/* Methodology note */}
      <section className="border-t border-neutral-100 pt-6">
        <h3 className="text-[12px] font-semibold text-neutral-600 mb-2">
          Methodology
        </h3>
        <div className="text-[11px] text-neutral-500 space-y-2 leading-relaxed max-w-2xl">
          <p>
            <strong>PCA:</strong> Computed on the correlation matrix of{" "}
            {data.featureMatrix.features.length} standardised features across{" "}
            {data.featureMatrix.groups.length} racial groups.  Eigendecomposition
            uses the Jacobi iterative method (Golub &amp; Van Loan, 2013).
            Groups with fewer than 10 applications are excluded.
          </p>
          <p>
            <strong>KBO decomposition:</strong> Follows Kitagawa (1955) and
            Blinder-Oaxaca (1973).  The raw denial-rate gap (group g vs. White)
            is decomposed as:
          </p>
          <p className="font-mono bg-neutral-100 rounded p-2 text-[10px]">
            Gap = Σₛ (shareₛᵍ − shareₛʷ)·rateₛʷ{"  "}
            {/* composition */}
            + Σₛ shareₛʷ·(rateₛᵍ − rateₛʷ){"  "}
            {/* treatment */}
            + Σₛ (shareₛᵍ − shareₛʷ)·(rateₛᵍ − rateₛʷ)
            {/* interaction */}
          </p>
          <p>
            Strata = loan types (conventional, FHA, VA, USDA).  Strata with
            fewer than 5 applications in either group are excluded from the
            decomposition but remain in totals.
          </p>
        </div>
      </section>
    </div>
  );
}
