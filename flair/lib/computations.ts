import { Aggregation, AggregationResponse } from "./hmda";
import { ACTION_ORIGINATED, ACTION_DENIED, RACE_LABELS } from "./constants";

export interface DenialRateEntry {
  group: string;
  label: string;
  applications: number;
  denials: number;
  originations: number;
  denialRate: number;
}

export interface DisparityRatio {
  group: string;
  label: string;
  ratio: number;
  denialRate: number;
  baselineDenialRate: number;
  applications: number;
}

export function computeDenialRates(data: AggregationResponse): DenialRateEntry[] {
  const groups = new Map<string, { denials: number; originations: number }>();

  for (const agg of data.aggregations) {
    const group = agg.races || agg.ethnicities || "Unknown";
    if (!groups.has(group)) {
      groups.set(group, { denials: 0, originations: 0 });
    }
    const entry = groups.get(group)!;
    if (agg.actions_taken === ACTION_DENIED) {
      entry.denials = agg.count;
    } else if (agg.actions_taken === ACTION_ORIGINATED) {
      entry.originations = agg.count;
    }
  }

  const results: DenialRateEntry[] = [];
  for (const [group, counts] of groups) {
    const applications = counts.denials + counts.originations;
    if (applications === 0) continue;
    results.push({
      group,
      label: RACE_LABELS[group] || group,
      applications,
      denials: counts.denials,
      originations: counts.originations,
      denialRate: counts.denials / applications,
    });
  }

  return results.sort((a, b) => b.denialRate - a.denialRate);
}

export function computeDisparityRatios(
  denialRates: DenialRateEntry[],
  baselineGroup = "White"
): DisparityRatio[] {
  const baseline = denialRates.find((r) => r.group === baselineGroup);
  if (!baseline || baseline.denialRate === 0) return [];

  return denialRates
    .filter((r) => r.group !== baselineGroup && r.applications >= 30)
    .map((r) => ({
      group: r.group,
      label: r.label,
      ratio: r.denialRate / baseline.denialRate,
      denialRate: r.denialRate,
      baselineDenialRate: baseline.denialRate,
      applications: r.applications,
    }))
    .sort((a, b) => b.ratio - a.ratio);
}

export function mergeRaceAndEthnicity(
  raceDenials: DenialRateEntry[],
  ethnicityDenials: DenialRateEntry[]
): DenialRateEntry[] {
  const hispanic = ethnicityDenials.find(
    (e) => e.group === "Hispanic or Latino"
  );
  const result = [...raceDenials];
  if (hispanic) {
    result.push(hispanic);
  }
  return result.sort((a, b) => b.denialRate - a.denialRate);
}
