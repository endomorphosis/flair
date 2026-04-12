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
      return mr ? { group: lr.label, lender: lr.ratio, market: mr.ratio } : null;
    })
    .filter(Boolean) as { group: string; lender: number; market: number }[];

  if (comparisons.length === 0) return null;

  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-1">
        Peer Comparison
      </p>
      <p className="text-[13px] text-neutral-400 mb-6">
        {lenderName} vs. all lenders in {state}
      </p>

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
              Market
            </th>
            <th className="text-right py-2 pl-4 text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
              Delta
            </th>
          </tr>
        </thead>
        <tbody>
          {comparisons.map((c) => {
            const diff = c.lender - c.market;
            const isWorse = diff > 0.1;
            return (
              <tr key={c.group} className="border-b border-neutral-100">
                <td className="py-3 pr-4 text-sm text-[#111]">
                  {c.group}
                </td>
                <td className="py-3 px-4 text-right font-semibold tabular-nums text-[#111]">
                  {c.lender.toFixed(2)}x
                </td>
                <td className="py-3 px-4 text-right tabular-nums text-neutral-500">
                  {c.market.toFixed(2)}x
                </td>
                <td className={`py-3 pl-4 text-right tabular-nums font-medium ${isWorse ? "text-red-700" : "text-neutral-400"}`}>
                  {diff > 0 ? "+" : ""}{diff.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
