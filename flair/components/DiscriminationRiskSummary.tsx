"use client";

import { DisparityRatio } from "@/lib/computations";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrendYear {
  year: number;
  disparityRatios: DisparityRatio[];
}

interface ControlledDisparitySummary {
  significantInConventionalPurchase: boolean;
  cmhLoanTypeSignificant: boolean;
  cmhIncomeBandSignificant: boolean;
  incomeBandsAvailable: boolean;
  anyGroupUnderpowered: boolean;
}

interface Props {
  disparityRatios: DisparityRatio[];
  marketRatios: DisparityRatio[];
  trends: TrendYear[];
  lenderName: string;
  geoLabel: string;
  yearLabel: string;
  controlledDisparity?: ControlledDisparitySummary | null;
}

// ─── Per-group signal ─────────────────────────────────────────────────────────

type RiskLevel = "high" | "elevated" | "moderate" | "low";
type TrendDirection = "worsening" | "stable" | "improving" | "unknown";

interface GroupSignal {
  group: string;
  label: string;
  ratio: number;
  denialRate: number;
  baselineDenialRate: number;
  applications: number;
  pValue: number | null;
  significant: boolean;    // p < 0.05
  verySignificant: boolean; // p < 0.01
  ciLower: number | null;
  ciUpper: number | null;
  peerGap: number | null;  // lender ratio − market ratio
  trendDirection: TrendDirection;
  riskLevel: RiskLevel;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeTrendDirection(group: string, trends: TrendYear[]): TrendDirection {
  const withGroup = trends
    .filter((t) => t.disparityRatios.some((r) => r.group === group))
    .sort((a, b) => a.year - b.year);
  if (withGroup.length < 2) return "unknown";
  const first = withGroup[0].disparityRatios.find((r) => r.group === group)?.ratio ?? 0;
  const last = withGroup[withGroup.length - 1].disparityRatios.find((r) => r.group === group)?.ratio ?? 0;
  const delta = last - first;
  if (delta > 0.1) return "worsening";
  if (delta < -0.1) return "improving";
  return "stable";
}

function computeRiskLevel(ratio: number, significant: boolean, verySignificant: boolean): RiskLevel {
  if (ratio >= 2.0 && verySignificant) return "high";
  if (ratio >= 2.0 || (ratio >= 1.5 && significant)) return "elevated";
  if (ratio >= 1.5 || ratio >= 1.2) return "moderate";
  return "low";
}

function buildSignals(
  disparityRatios: DisparityRatio[],
  marketRatios: DisparityRatio[],
  trends: TrendYear[]
): GroupSignal[] {
  return disparityRatios.map((r) => {
    const pValue: number | null =
      r.chiSquare?.pValue != null ? r.chiSquare.pValue : null;
    const significant = r.chiSquare?.significant ?? false;
    const verySignificant = pValue != null && pValue < 0.01;

    const marketRatio = marketRatios.find((m) => m.group === r.group)?.ratio ?? null;
    const peerGap = marketRatio !== null ? r.ratio - marketRatio : null;

    const trendDirection = computeTrendDirection(r.group, trends);
    const riskLevel = computeRiskLevel(r.ratio, significant, verySignificant);

    return {
      group: r.group,
      label: r.label,
      ratio: r.ratio,
      denialRate: r.denialRate,
      baselineDenialRate: r.baselineDenialRate,
      applications: r.applications,
      pValue,
      significant,
      verySignificant,
      ciLower: r.ci?.lower ?? null,
      ciUpper: r.ci?.upper ?? null,
      peerGap,
      trendDirection,
      riskLevel,
    };
  });
}

const RISK_ORDER: RiskLevel[] = ["high", "elevated", "moderate", "low"];

function overallRiskLevel(signals: GroupSignal[]): RiskLevel {
  for (const lvl of RISK_ORDER) {
    if (signals.some((s) => s.riskLevel === lvl)) return lvl;
  }
  return "low";
}

// ─── Cell renderers ───────────────────────────────────────────────────────────

function RatioBadge({ ratio }: { ratio: number }) {
  let bg = "bg-neutral-100 text-neutral-500";
  if (ratio >= 2.0) bg = "bg-red-100 text-red-800 font-bold";
  else if (ratio >= 1.5) bg = "bg-orange-100 text-orange-800 font-semibold";
  else if (ratio >= 1.2) bg = "bg-amber-50 text-amber-800";
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[12px] tabular-nums ${bg}`}>
      {ratio.toFixed(2)}x
    </span>
  );
}

function SigBadge({ pValue, significant }: { pValue: number | null; significant: boolean }) {
  if (pValue === null) return <span className="text-neutral-300 text-[12px]">—</span>;
  if (pValue < 0.01) return <span className="text-red-700 font-bold text-[12px]" title={`p=${pValue.toFixed(4)}`}>★★</span>;
  if (significant) return <span className="text-orange-700 font-semibold text-[12px]" title={`p=${pValue.toFixed(4)}`}>★</span>;
  return <span className="text-neutral-400 text-[12px]" title={`p=${pValue.toFixed(3)}`}>ns</span>;
}

function PeerBadge({ gap }: { gap: number | null }) {
  if (gap === null) return <span className="text-neutral-300 text-[12px]">—</span>;
  if (gap > 0.3) return (
    <span className="text-red-700 font-semibold text-[12px]">+{gap.toFixed(2)}</span>
  );
  if (gap > 0.1) return (
    <span className="text-orange-700 text-[12px]">+{gap.toFixed(2)}</span>
  );
  if (gap < -0.1) return (
    <span className="text-green-700 text-[12px]">{gap.toFixed(2)}</span>
  );
  return <span className="text-neutral-400 text-[12px]">{gap > 0 ? "+" : ""}{gap.toFixed(2)}</span>;
}

function TrendBadge({ direction }: { direction: TrendDirection }) {
  switch (direction) {
    case "worsening": return <span className="text-red-600 font-bold text-[13px]" title="Worsening trend">↑</span>;
    case "improving": return <span className="text-green-600 font-bold text-[13px]" title="Improving trend">↓</span>;
    case "stable": return <span className="text-neutral-400 text-[13px]" title="Stable">→</span>;
    default: return <span className="text-neutral-300 text-[12px]">—</span>;
  }
}

function RiskLevelChip({ level }: { level: RiskLevel }) {
  const styles: Record<RiskLevel, string> = {
    high: "bg-red-700 text-white",
    elevated: "bg-orange-500 text-white",
    moderate: "bg-amber-400 text-[#111]",
    low: "bg-neutral-200 text-neutral-600",
  };
  const labels: Record<RiskLevel, string> = {
    high: "HIGH",
    elevated: "ELEVATED",
    moderate: "MODERATE",
    low: "LOW",
  };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold tracking-wide ${styles[level]}`}>
      {labels[level]}
    </span>
  );
}

// ─── Alert banner ─────────────────────────────────────────────────────────────

function AlertBanner({
  overall,
  topSignals,
  lenderName,
}: {
  overall: RiskLevel;
  topSignals: GroupSignal[];
  lenderName: string;
}) {
  const highSignals = topSignals.filter((s) => s.riskLevel === "high" || s.riskLevel === "elevated");
  const targetGroups = highSignals.map((s) => s.label).join(", ") ||
    topSignals.slice(0, 2).map((s) => s.label).join(", ");

  const bannerStyles: Record<RiskLevel, string> = {
    high: "border-red-300 bg-red-50",
    elevated: "border-orange-300 bg-orange-50",
    moderate: "border-amber-200 bg-amber-50",
    low: "border-neutral-200 bg-neutral-50",
  };

  const icons: Record<RiskLevel, string> = {
    high: "⚠",
    elevated: "⚡",
    moderate: "◉",
    low: "✓",
  };

  const headlines: Record<RiskLevel, string> = {
    high: "Strong statistical evidence of discrimination",
    elevated: "Elevated discrimination risk detected",
    moderate: "Moderate disparity — investigation warranted",
    low: "No significant disparity detected",
  };

  const sublines: Record<RiskLevel, string> = {
    high: `${lenderName} shows statistically significant denial-rate disparities against ${targetGroups || "minority"} applicants that meet DOJ/CFPB enforcement thresholds.`,
    elevated: `${lenderName} shows above-market denial-rate disparities for ${targetGroups || "minority"} applicants. Controlled analysis recommended.`,
    moderate: `${lenderName} shows disparity patterns for ${targetGroups || "some"} groups that warrant closer examination through stratified controls.`,
    low: `Available data does not show statistically significant denial-rate disparities at ${lenderName} for this geography and time period.`,
  };

  return (
    <div className={`rounded-lg border px-5 py-4 flex gap-4 items-start ${bannerStyles[overall]}`}>
      <span className="text-2xl leading-none mt-0.5 flex-shrink-0">{icons[overall]}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <p className="text-sm font-semibold text-[#111]">{headlines[overall]}</p>
          <RiskLevelChip level={overall} />
        </div>
        <p className="text-[13px] text-neutral-600 leading-relaxed">{sublines[overall]}</p>
      </div>
    </div>
  );
}

// ─── Risk matrix ──────────────────────────────────────────────────────────────

function RiskMatrix({
  signals,
  showPeer,
  showTrend,
}: {
  signals: GroupSignal[];
  showPeer: boolean;
  showTrend: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-3">
        Evidence by Demographic Group
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="text-left py-2 pr-4 text-[11px] font-medium text-neutral-500 uppercase tracking-wide">
                Group
              </th>
              <th className="text-center py-2 px-3 text-[11px] font-medium text-neutral-500 uppercase tracking-wide">
                Denial Ratio
                <span className="block text-[9px] normal-case tracking-normal font-normal text-neutral-400">vs. White</span>
              </th>
              <th className="text-center py-2 px-3 text-[11px] font-medium text-neutral-500 uppercase tracking-wide">
                Significance
                <span className="block text-[9px] normal-case tracking-normal font-normal text-neutral-400">★★ p&lt;.01 ★ p&lt;.05</span>
              </th>
              {showPeer && (
                <th className="text-center py-2 px-3 text-[11px] font-medium text-neutral-500 uppercase tracking-wide">
                  vs. Market
                  <span className="block text-[9px] normal-case tracking-normal font-normal text-neutral-400">lender − peers</span>
                </th>
              )}
              {showTrend && (
                <th className="text-center py-2 px-3 text-[11px] font-medium text-neutral-500 uppercase tracking-wide">
                  Trend
                  <span className="block text-[9px] normal-case tracking-normal font-normal text-neutral-400">↑ worsening</span>
                </th>
              )}
              <th className="text-center py-2 px-3 text-[11px] font-medium text-neutral-500 uppercase tracking-wide">
                Applications
              </th>
              <th className="text-center py-2 pl-3 text-[11px] font-medium text-neutral-500 uppercase tracking-wide">
                Risk
              </th>
            </tr>
          </thead>
          <tbody>
            {signals.map((s) => {
              const rowBg =
                s.riskLevel === "high"
                  ? "bg-red-50"
                  : s.riskLevel === "elevated"
                  ? "bg-orange-50"
                  : s.riskLevel === "moderate"
                  ? "bg-amber-50/40"
                  : "";
              return (
                <tr key={s.group} className={`border-b border-neutral-100 ${rowBg}`}>
                  <td className="py-2.5 pr-4">
                    <span className="font-medium text-[#111]">{s.label}</span>
                    <span className="ml-2 text-[11px] text-neutral-400">
                      {(s.denialRate * 100).toFixed(1)}% denied
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <RatioBadge ratio={s.ratio} />
                    {s.ciLower !== null && s.ciUpper !== null && (
                      <span className="block text-[10px] text-neutral-400 mt-0.5">
                        [{s.ciLower.toFixed(2)}–{s.ciUpper.toFixed(2)}]
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <SigBadge pValue={s.pValue} significant={s.significant} />
                    {s.pValue !== null && (
                      <span className="block text-[10px] text-neutral-400 mt-0.5">
                        p={s.pValue < 0.001 ? "<.001" : s.pValue.toFixed(3)}
                      </span>
                    )}
                  </td>
                  {showPeer && (
                    <td className="py-2.5 px-3 text-center">
                      <PeerBadge gap={s.peerGap} />
                    </td>
                  )}
                  {showTrend && (
                    <td className="py-2.5 px-3 text-center">
                      <TrendBadge direction={s.trendDirection} />
                    </td>
                  )}
                  <td className="py-2.5 px-3 text-center text-neutral-500">
                    {s.applications.toLocaleString()}
                  </td>
                  <td className="py-2.5 pl-3 text-center">
                    <RiskLevelChip level={s.riskLevel} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-neutral-400">
        <span><strong className="text-red-700">★★</strong> p&lt;0.01 — very strong statistical evidence</span>
        <span><strong className="text-orange-700">★</strong> p&lt;0.05 — statistically significant</span>
        <span>Ratio 95% CI shown in brackets — excludes 1.0 when significant</span>
        {showPeer && <span>vs. Market = lender disparity ratio minus state-wide peer ratio</span>}
      </div>
    </div>
  );
}

// ─── Top findings summary ─────────────────────────────────────────────────────

function FindingsSummary({
  signals,
  lenderName,
  geoLabel,
  yearLabel,
  controlledDisparity,
}: {
  signals: GroupSignal[];
  lenderName: string;
  geoLabel: string;
  yearLabel: string;
  controlledDisparity?: ControlledDisparitySummary | null;
}) {
  const high = signals.filter((s) => s.riskLevel === "high");
  const elevated = signals.filter((s) => s.riskLevel === "elevated");
  const moderate = signals.filter((s) => s.riskLevel === "moderate");
  const peerOutliers = signals.filter((s) => s.peerGap !== null && s.peerGap > 0.3);
  const worseningTrend = signals.filter((s) => s.trendDirection === "worsening");

  if (high.length === 0 && elevated.length === 0 && moderate.length === 0) {
    return (
      <div className="text-[13px] text-neutral-500 bg-neutral-50 rounded p-4">
        No groups meet the threshold for elevated disparity risk at {lenderName} in {geoLabel} during {yearLabel}.
        Disparity ratios below 1.2x and no statistically significant differences detected.
      </div>
    );
  }

  const bullets: string[] = [];

  if (high.length > 0) {
    const g = high.map((s) => s.label).join(" and ");
    const top = high[0];
    bullets.push(
      `${g} applicants face HIGH-risk disparity: ${top.ratio.toFixed(1)}x denial rate vs. White (p${top.pValue && top.pValue < 0.01 ? "<0.01" : "<0.05"}, ${top.applications.toLocaleString()} applications).`
    );
  }
  if (elevated.length > 0) {
    const g = elevated.map((s) => s.label).join(" and ");
    bullets.push(
      `${g} applicants show ELEVATED disparity (${elevated.map((s) => s.ratio.toFixed(1) + "x").join(", ")}).`
    );
  }
  if (moderate.length > 0) {
    const g = moderate.map((s) => s.label).join(" and ");
    bullets.push(
      `${g} applicants show MODERATE disparity (${moderate.map((s) => s.ratio.toFixed(1) + "x").join(", ")}) — below statistical significance thresholds without controlled analysis.`
    );
  }
  if (peerOutliers.length > 0) {
    const g = peerOutliers.map((s) => s.label).join(", ");
    bullets.push(
      `For ${g}, ${lenderName} is a market outlier — disparity ratio exceeds the state-wide peer average by ${peerOutliers.map((s) => "+" + (s.peerGap ?? 0).toFixed(2)).join(", ")}.`
    );
  }
  if (worseningTrend.length > 0) {
    const g = worseningTrend.map((s) => s.label).join(", ");
    bullets.push(
      `Disparities against ${g} are worsening over the observed trend period — a pattern regulators treat as aggravating.`
    );
  }
  if (controlledDisparity) {
    if (controlledDisparity.cmhLoanTypeSignificant || controlledDisparity.significantInConventionalPurchase) {
      bullets.push(
        "Controlled analysis (Controls tab) confirms disparity persists after stratifying by loan type — strengthening the disparate treatment theory."
      );
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase mb-3">
        Key Findings — {lenderName} · {geoLabel} · {yearLabel}
      </p>
      <ul className="space-y-2">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2 text-[13px] text-neutral-700 leading-relaxed">
            <span className="mt-0.5 flex-shrink-0 text-neutral-400">•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DiscriminationRiskSummary({
  disparityRatios,
  marketRatios,
  trends,
  lenderName,
  geoLabel,
  yearLabel,
  controlledDisparity,
}: Props) {
  if (disparityRatios.length === 0) return null;

  const signals = buildSignals(disparityRatios, marketRatios, trends);
  const overall = overallRiskLevel(signals);
  const showPeer = marketRatios.length > 0;
  const showTrend = trends.length >= 2;

  return (
    <div className="space-y-6">
      {/* Alert banner */}
      <AlertBanner overall={overall} topSignals={signals} lenderName={lenderName} />

      {/* Risk matrix */}
      <RiskMatrix signals={signals} showPeer={showPeer} showTrend={showTrend} />

      {/* Key findings */}
      <FindingsSummary
        signals={signals}
        lenderName={lenderName}
        geoLabel={geoLabel}
        yearLabel={yearLabel}
        controlledDisparity={controlledDisparity}
      />
    </div>
  );
}
