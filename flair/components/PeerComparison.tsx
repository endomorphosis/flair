"use client";

import { DisparityRatio } from "@/lib/computations";

interface Props {
  lenderRatios: DisparityRatio[];
  marketRatios: DisparityRatio[];
  lenderName: string;
  state: string;
}

function ratioColor(ratio: number): string {
  if (ratio >= 2.0) return "text-red-600";
  if (ratio >= 1.5) return "text-amber-600";
  return "text-slate-700";
}

export default function PeerComparison({
  lenderRatios,
  marketRatios,
  lenderName,
  state,
}: Props) {
  // Match lender ratios with market ratios by group
  const comparisons = lenderRatios
    .map((lr) => {
      const mr = marketRatios.find((m) => m.group === lr.group);
      return mr ? { group: lr.label, lender: lr.ratio, market: mr.ratio } : null;
    })
    .filter(Boolean) as { group: string; lender: number; market: number }[];

  if (comparisons.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-1">
        Peer Comparison
      </h3>
      <p className="text-sm text-slate-500 mb-4">
        {lenderName} vs. all lenders statewide in {state}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 pr-4 font-medium text-slate-500">
                Group
              </th>
              <th className="text-right py-2 px-4 font-medium text-slate-500">
                {lenderName}
              </th>
              <th className="text-right py-2 px-4 font-medium text-slate-500">
                State Average
              </th>
              <th className="text-right py-2 pl-4 font-medium text-slate-500">
                Difference
              </th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map((c) => {
              const diff = c.lender - c.market;
              const isWorse = diff > 0.1;
              return (
                <tr key={c.group} className="border-b border-slate-100">
                  <td className="py-2.5 pr-4 font-medium text-slate-800">
                    {c.group}
                  </td>
                  <td
                    className={`py-2.5 px-4 text-right font-bold ${ratioColor(c.lender)}`}
                  >
                    {c.lender.toFixed(2)}x
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-600">
                    {c.market.toFixed(2)}x
                  </td>
                  <td
                    className={`py-2.5 pl-4 text-right font-semibold ${
                      isWorse ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {diff > 0 ? "+" : ""}
                    {diff.toFixed(2)}
                    {isWorse && (
                      <span className="ml-1.5 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                        Outlier
                      </span>
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
