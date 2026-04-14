"use client";

import { DisparityRatio } from "@/lib/computations";

interface Props {
  lenderRatios: DisparityRatio[];
  marketRatios: DisparityRatio[];
  lenderName: string;
  state: string;
}

export default function PeerComparison({
  lenderRatios,
  marketRatios,
  lenderName,
  state,
}: Props) {
  const comparisons = lenderRatios
    .map((lr) => {
      const mr = marketRatios.find((m) => m.group === lr.group);
      return mr
        ? {
            group: lr.group,
            label: lr.label,
            lender: lr.ratio,
            market: mr.ratio,
            diff: lr.ratio - mr.ratio,
          }
        : null;
    })
    .filter(Boolean) as {
      group: string;
      label: string;
      lender: number;
      market: number;
      diff: number;
    }[];

  if (comparisons.length === 0) return null;

  // Determine overall lender posture vs. market
  const outlierGroups = comparisons.filter((c) => c.diff > 0.3);
  const worseGroups = comparisons.filter((c) => c.diff > 0.1);
  const betterGroups = comparisons.filter((c) => c.diff < -0.1);

  const overallBadge = (() => {
    if (outlierGroups.length > 0)
      return { label: "Market outlier", style: "bg-red-100 text-red-800 border border-red-200" };
    if (worseGroups.length > 0)
      return { label: "Above-market disparity", style: "bg-orange-100 text-orange-700 border border-orange-200" };
    if (betterGroups.length === comparisons.length)
      return { label: "Below-market disparity", style: "bg-green-100 text-green-800 border border-green-200" };
    return { label: "Near-market", style: "bg-neutral-100 text-neutral-600 border border-neutral-200" };
  })();

  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-1">
        Peer Comparison
      </p>
      <div className="flex items-center gap-3 mb-4">
        <p className="text-[13px] text-neutral-400">
          {lenderName} vs. all lenders in {state}
        </p>
        <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${overallBadge.style}`}>
          {overallBadge.label}
        </span>
      </div>

      {/* Outlier callout */}
      {outlierGroups.length > 0 && (
        <div className="mb-5 rounded border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-[13px] text-red-800 font-semibold mb-1">
            ⚠ Market outlier: {outlierGroups.map((g) => g.label).join(", ")}
          </p>
          <p className="text-[12px] text-red-700 leading-relaxed">
            {lenderName}&apos;s disparity ratio for {outlierGroups.map((g) => g.label).join(" and ")}{" "}
            exceeds the state-wide peer average by{" "}
            {outlierGroups.map((g) => `+${g.diff.toFixed(2)}`).join(", ")}.
            DOJ Combating Redlining Initiative guidance cites above-peer disparity as a primary
            screening indicator.
          </p>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200">
            <th className="text-left py-2 pr-4 text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
              Group
            </th>
            <th className="text-right py-2 px-4 text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
              Lender
            </th>
            <th className="text-right py-2 px-4 text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
              Market avg
            </th>
            <th className="text-right py-2 pl-4 text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
              Delta
            </th>
          </tr>
        </thead>
        <tbody>
          {comparisons.map((c) => {
            const isOutlier = c.diff > 0.3;
            const isWorse = c.diff > 0.1;
            const isBetter = c.diff < -0.1;
            const rowBg = isOutlier ? "bg-red-50" : isWorse ? "bg-orange-50" : "";
            return (
              <tr key={c.group} className={`border-b border-neutral-100 ${rowBg}`}>
                <td className="py-3 pr-4 text-sm text-[#111]">
                  {c.label}
                  {isOutlier && (
                    <span className="ml-2 text-[10px] font-bold text-red-700 uppercase tracking-wide">outlier</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right font-semibold tabular-nums text-[#111]">
                  {c.lender.toFixed(2)}x
                </td>
                <td className="py-3 px-4 text-right tabular-nums text-neutral-500">
                  {c.market.toFixed(2)}x
                </td>
                <td className={`py-3 pl-4 text-right tabular-nums font-medium ${
                  isOutlier ? "text-red-700" : isWorse ? "text-orange-700" : isBetter ? "text-green-700" : "text-neutral-400"
                }`}>
                  {c.diff > 0 ? "+" : ""}{c.diff.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="text-[11px] text-neutral-400 mt-3">
        Market average = state-wide aggregate disparity ratio across all lenders with ≥30 applications from each group.
        Delta {">"} +0.30 flagged as market outlier.
      </p>
    </div>
  );
}
