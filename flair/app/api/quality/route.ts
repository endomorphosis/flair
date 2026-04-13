/**
 * /api/quality — Data quality and confounding disclosure
 *
 * Returns:
 *   - Loan type distribution by race (flags 20pp+ imbalances)
 *   - Application completeness rates by race (withdrawn + incomplete)
 *   - Occupancy type distribution by race
 *
 * These are the primary observable confounders available in public HMDA data.
 * A 20-percentage-point difference in FHA usage between racial groups means
 * the raw denial-rate comparison conflates loan-type differences with race
 * and must be disclosed in any legal filing.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  getLoanTypeMixByRace,
  getWithdrawalDataByRace,
  getOccupancyMixByRace,
  LOAN_TYPE_LABELS,
  ACTION_WITHDRAWN,
  ACTION_INCOMPLETE,
  AggregationResponse,
} from "@/lib/hmda";
import { ACTION_ORIGINATED, ACTION_DENIED, RACE_LABELS } from "@/lib/constants";

const MIN_LOAN_TYPE_IMBALANCE_PP = 20; // percentage points

interface RaceLoanTypeSplit {
  race: string;
  label: string;
  totalApplications: number;
  byLoanType: { loanType: string; loanTypeLabel: string; pct: number; count: number }[];
}

interface LoanTypeMixResult {
  byRace: RaceLoanTypeSplit[];
  /** Groups where FHA usage differs by ≥20pp from the White group */
  fhaImbalanceFlags: { race: string; label: string; fhaPct: number; whiteFhaPct: number; diffPp: number }[];
  /** True if any group has ≥20pp loan-type mix difference vs. White */
  hasSignificantMixImbalance: boolean;
}

function computeLoanTypeMix(data: AggregationResponse): LoanTypeMixResult {
  // Aggregate: (race, loan_type) -> total applications
  const raceLoanMap = new Map<string, Map<string, number>>();

  for (const agg of data.aggregations) {
    if (!agg.races || !agg.loan_types) continue;
    if (!raceLoanMap.has(agg.races)) raceLoanMap.set(agg.races, new Map());
    const ltMap = raceLoanMap.get(agg.races)!;
    ltMap.set(agg.loan_types, (ltMap.get(agg.loan_types) ?? 0) + agg.count);
  }

  const byRace: RaceLoanTypeSplit[] = [];
  for (const [race, ltMap] of raceLoanMap) {
    const total = [...ltMap.values()].reduce((s, v) => s + v, 0);
    if (total === 0) continue;
    const byLoanType = [...ltMap.entries()].map(([lt, count]) => ({
      loanType: lt,
      loanTypeLabel: LOAN_TYPE_LABELS[lt] ?? lt,
      pct: (count / total) * 100,
      count,
    })).sort((a, b) => b.pct - a.pct);
    byRace.push({
      race,
      label: RACE_LABELS[race] ?? race,
      totalApplications: total,
      byLoanType,
    });
  }

  // Flag FHA imbalances vs. White
  const whiteEntry = byRace.find((r) => r.race === "White");
  const whiteFhaPct = whiteEntry?.byLoanType.find((lt) => lt.loanType === "2")?.pct ?? 0;
  const fhaImbalanceFlags = byRace
    .filter((r) => r.race !== "White")
    .map((r) => {
      const fhaPct = r.byLoanType.find((lt) => lt.loanType === "2")?.pct ?? 0;
      return {
        race: r.race,
        label: r.label,
        fhaPct,
        whiteFhaPct,
        diffPp: fhaPct - whiteFhaPct,
      };
    })
    .filter((f) => Math.abs(f.diffPp) >= MIN_LOAN_TYPE_IMBALANCE_PP);

  return {
    byRace,
    fhaImbalanceFlags,
    hasSignificantMixImbalance: fhaImbalanceFlags.length > 0,
  };
}

interface WithdrawalStats {
  race: string;
  label: string;
  originated: number;
  denied: number;
  withdrawn: number;
  incomplete: number;
  totalSubmitted: number;
  /** (withdrawn + incomplete) / (originated + denied + withdrawn + incomplete) */
  attritionRate: number;
}

function computeWithdrawalStats(data: AggregationResponse): WithdrawalStats[] {
  const counts = new Map<
    string,
    { originated: number; denied: number; withdrawn: number; incomplete: number }
  >();

  for (const agg of data.aggregations) {
    if (!agg.races) continue;
    if (!counts.has(agg.races)) {
      counts.set(agg.races, { originated: 0, denied: 0, withdrawn: 0, incomplete: 0 });
    }
    const entry = counts.get(agg.races)!;
    if (agg.actions_taken === ACTION_ORIGINATED) entry.originated += agg.count;
    else if (agg.actions_taken === ACTION_DENIED) entry.denied += agg.count;
    else if (agg.actions_taken === ACTION_WITHDRAWN) entry.withdrawn += agg.count;
    else if (agg.actions_taken === ACTION_INCOMPLETE) entry.incomplete += agg.count;
  }

  const result: WithdrawalStats[] = [];
  for (const [race, c] of counts) {
    const total = c.originated + c.denied + c.withdrawn + c.incomplete;
    if (total === 0) continue;
    result.push({
      race,
      label: RACE_LABELS[race] ?? race,
      ...c,
      totalSubmitted: total,
      attritionRate: (c.withdrawn + c.incomplete) / total,
    });
  }
  return result.sort((a, b) => b.attritionRate - a.attritionRate);
}

interface OccupancySplit {
  race: string;
  label: string;
  principalPct: number;
  secondPct: number;
  investmentPct: number;
  totalApplications: number;
}

function computeOccupancyMix(data: AggregationResponse): OccupancySplit[] {
  const racOccMap = new Map<string, { p: number; s: number; i: number }>();

  for (const agg of data.aggregations) {
    if (!agg.races || !agg.occupancy_types) continue;
    if (!racOccMap.has(agg.races)) racOccMap.set(agg.races, { p: 0, s: 0, i: 0 });
    const entry = racOccMap.get(agg.races)!;
    if (agg.occupancy_types === "1") entry.p += agg.count;
    else if (agg.occupancy_types === "2") entry.s += agg.count;
    else if (agg.occupancy_types === "3") entry.i += agg.count;
  }

  const result: OccupancySplit[] = [];
  for (const [race, c] of racOccMap) {
    const total = c.p + c.s + c.i;
    if (total === 0) continue;
    result.push({
      race,
      label: RACE_LABELS[race] ?? race,
      principalPct: (c.p / total) * 100,
      secondPct: (c.s / total) * 100,
      investmentPct: (c.i / total) * 100,
      totalApplications: total,
    });
  }
  return result;
}

export async function GET(req: NextRequest) {
  const lei = req.nextUrl.searchParams.get("lei");
  const state = req.nextUrl.searchParams.get("state") || undefined;
  const msa = req.nextUrl.searchParams.get("msa") || undefined;
  const years =
    req.nextUrl.searchParams.get("years") ||
    req.nextUrl.searchParams.get("year") ||
    "2023";

  if (!lei || (!state && !msa)) {
    return NextResponse.json(
      { error: "lei and either state or msa are required" },
      { status: 400 }
    );
  }

  try {
    const [loanTypeMixData, withdrawalData, occupancyData] = await Promise.all([
      getLoanTypeMixByRace(lei, years, state, msa).catch(() => null),
      getWithdrawalDataByRace(lei, years, state, msa).catch(() => null),
      getOccupancyMixByRace(lei, years, state, msa).catch(() => null),
    ]);

    const loanTypeMix = loanTypeMixData
      ? computeLoanTypeMix(loanTypeMixData)
      : null;

    const withdrawalStats = withdrawalData
      ? computeWithdrawalStats(withdrawalData)
      : null;

    const occupancyMix = occupancyData
      ? computeOccupancyMix(occupancyData)
      : null;

    return NextResponse.json({
      loanTypeMix,
      withdrawalStats,
      occupancyMix,
      years,
      state,
      msa,
      lei,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
