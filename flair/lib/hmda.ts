import { HMDA_BASE, RACES, ETHNICITIES, ACTION_ORIGINATED, ACTION_DENIED } from "./constants";

export const ACTION_WITHDRAWN = "4";
export const ACTION_INCOMPLETE = "5";

export interface Filer {
  lei: string;
  name: string;
  period: string;
}

export interface Aggregation {
  count: number;
  sum: number;
  actions_taken: string;
  races?: string;
  ethnicities?: string;
  loan_types?: string;
  loan_purposes?: string;
  occupancy_types?: string;
}

export interface AggregationResponse {
  parameters: Record<string, string>;
  aggregations: Aggregation[];
}

// Geographic filter: either state or MSA
function geoParam(state?: string, msa?: string): string {
  if (msa) return `msamds=${msa}`;
  if (state) return `states=${state}`;
  throw new Error("Either state or msa is required");
}

const filersCache = new Map<number, Filer[]>();

export async function searchLenders(query: string, year: number): Promise<Filer[]> {
  let filers = filersCache.get(year);
  if (!filers) {
    const res = await fetch(`${HMDA_BASE}/v2/reporting/filers/${year}`);
    if (!res.ok) throw new Error(`Filers API error: ${res.status}`);
    const data = await res.json();
    filers = data.institutions as Filer[];
    filersCache.set(year, filers);
  }
  const q = query.toLowerCase();
  return filers
    .filter((f) => f.name.toLowerCase().includes(q))
    .slice(0, 20);
}

export async function getDisparityData(
  lei: string,
  years: string,
  state?: string,
  msa?: string,
): Promise<AggregationResponse> {
  const races = RACES.join(",");
  const url = `${HMDA_BASE}/v2/data-browser-api/view/aggregations?leis=${lei}&${geoParam(state, msa)}&years=${years}&actions_taken=${ACTION_ORIGINATED},${ACTION_DENIED}&races=${encodeURIComponent(races)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Aggregation API error: ${res.status}`);
  return res.json();
}

export async function getEthnicityData(
  lei: string,
  years: string,
  state?: string,
  msa?: string,
): Promise<AggregationResponse> {
  const ethnicities = ETHNICITIES.join(",");
  const url = `${HMDA_BASE}/v2/data-browser-api/view/aggregations?leis=${lei}&${geoParam(state, msa)}&years=${years}&actions_taken=${ACTION_ORIGINATED},${ACTION_DENIED}&ethnicities=${encodeURIComponent(ethnicities)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Ethnicity API error: ${res.status}`);
  return res.json();
}

export async function getAggregate(
  years: string,
  state?: string,
  msa?: string,
): Promise<AggregationResponse> {
  const races = RACES.join(",");
  const url = `${HMDA_BASE}/v2/data-browser-api/view/aggregations?${geoParam(state, msa)}&years=${years}&actions_taken=${ACTION_ORIGINATED},${ACTION_DENIED}&races=${encodeURIComponent(races)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Aggregate API error: ${res.status}`);
  return res.json();
}

export async function getEthnicityAggregate(
  years: string,
  state?: string,
  msa?: string,
): Promise<AggregationResponse> {
  const ethnicities = ETHNICITIES.join(",");
  const url = `${HMDA_BASE}/v2/data-browser-api/view/aggregations?${geoParam(state, msa)}&years=${years}&actions_taken=${ACTION_ORIGINATED},${ACTION_DENIED}&ethnicities=${encodeURIComponent(ethnicities)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Ethnicity aggregate API error: ${res.status}`);
  return res.json();
}

// ─── Stratified queries ────────────────────────────────────────────────────────

/** Loan type codes per HMDA/FFIEC reporting. */
export const LOAN_TYPES = {
  CONVENTIONAL: "1",
  FHA: "2",
  VA: "3",
  USDA: "4",
} as const;

export const LOAN_TYPE_LABELS: Record<string, string> = {
  "1": "Conventional",
  "2": "FHA",
  "3": "VA",
  "4": "USDA",
};

/** Loan purpose codes per HMDA/FFIEC reporting. */
export const LOAN_PURPOSES = {
  PURCHASE: "1",
  HOME_IMPROVEMENT: "2",
  /** Refinancing — rate/term (HMDA uses code 31 to distinguish from cash-out) */
  REFINANCE: "31",
  /** Cash-out refinancing (separate HMDA code 32, distinct underwriting profile) */
  CASH_OUT_REFINANCE: "32",
  OTHER: "4",
} as const;

/** Occupancy type codes. */
export const OCCUPANCY_TYPES = {
  PRINCIPAL: "1",
  SECOND: "2",
  INVESTMENT: "3",
} as const;

/**
 * Query disparity data filtered to a specific loan type and/or loan purpose.
 * Useful for computing denial-rate disparities within a homogeneous stratum.
 */
export async function getStratifiedDisparityData(
  lei: string,
  years: string,
  state?: string,
  msa?: string,
  loanType?: string,   // e.g. "1" for conventional
  loanPurpose?: string // e.g. "1" for purchase
): Promise<AggregationResponse> {
  const races = RACES.join(",");
  let url =
    `${HMDA_BASE}/v2/data-browser-api/view/aggregations?leis=${lei}&${geoParam(state, msa)}` +
    `&years=${years}&actions_taken=${ACTION_ORIGINATED},${ACTION_DENIED}` +
    `&races=${encodeURIComponent(races)}`;
  if (loanType) url += `&loan_types=${loanType}`;
  if (loanPurpose) url += `&loan_purposes=${loanPurpose}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Stratified API error: ${res.status}`);
  return res.json();
}

/**
 * Get loan type distribution cross-tabulated by race.
 * Returns aggregations keyed by (race, loan_type, action_taken).
 */
export async function getLoanTypeMixByRace(
  lei: string,
  years: string,
  state?: string,
  msa?: string,
): Promise<AggregationResponse> {
  const races = RACES.join(",");
  const loanTypes = Object.values(LOAN_TYPES).join(",");
  const url =
    `${HMDA_BASE}/v2/data-browser-api/view/aggregations?leis=${lei}&${geoParam(state, msa)}` +
    `&years=${years}&actions_taken=${ACTION_ORIGINATED},${ACTION_DENIED}` +
    `&races=${encodeURIComponent(races)}&loan_types=${loanTypes}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Loan type mix API error: ${res.status}`);
  return res.json();
}

/**
 * Get counts of withdrawn (action=4) and incomplete (action=5) applications
 * cross-tabulated by race — used to detect process-friction disparities.
 */
export async function getWithdrawalDataByRace(
  lei: string,
  years: string,
  state?: string,
  msa?: string,
): Promise<AggregationResponse> {
  const races = RACES.join(",");
  const url =
    `${HMDA_BASE}/v2/data-browser-api/view/aggregations?leis=${lei}&${geoParam(state, msa)}` +
    `&years=${years}&actions_taken=${ACTION_ORIGINATED},${ACTION_DENIED},${ACTION_WITHDRAWN},${ACTION_INCOMPLETE}` +
    `&races=${encodeURIComponent(races)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Withdrawal data API error: ${res.status}`);
  return res.json();
}

/**
 * Get loan purpose distribution cross-tabulated by race.
 * Returns aggregations keyed by (race, loan_purpose, action_taken).
 */
export async function getLoanPurposeMixByRace(
  lei: string,
  years: string,
  state?: string,
  msa?: string,
): Promise<AggregationResponse> {
  const races = RACES.join(",");
  const loanPurposes = Object.values(LOAN_PURPOSES).join(",");
  const url =
    `${HMDA_BASE}/v2/data-browser-api/view/aggregations?leis=${lei}&${geoParam(state, msa)}` +
    `&years=${years}&actions_taken=${ACTION_ORIGINATED},${ACTION_DENIED}` +
    `&races=${encodeURIComponent(races)}&loan_purposes=${loanPurposes}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Loan purpose mix API error: ${res.status}`);
  return res.json();
}

/**
 * Get occupancy type distribution by race
 * (principal residence vs. second home vs. investment property).
 */
export async function getOccupancyMixByRace(
  lei: string,
  years: string,
  state?: string,
  msa?: string,
): Promise<AggregationResponse> {
  const races = RACES.join(",");
  const occupancyTypes = Object.values(OCCUPANCY_TYPES).join(",");
  const url =
    `${HMDA_BASE}/v2/data-browser-api/view/aggregations?leis=${lei}&${geoParam(state, msa)}` +
    `&years=${years}&actions_taken=${ACTION_ORIGINATED},${ACTION_DENIED}` +
    `&races=${encodeURIComponent(races)}&occupancy_types=${occupancyTypes}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Occupancy mix API error: ${res.status}`);
  return res.json();
}

/**
 * Query disparity data for a specific income band (in $1,000s).
 * Uses income_lower_bound / income_upper_bound HMDA API parameters.
 * Returns null if the API does not support income range filtering.
 */
export async function getIncomeBandDisparityData(
  lei: string,
  years: string,
  state?: string,
  msa?: string,
  incomeLower?: number, // in $1,000s
  incomeUpper?: number, // in $1,000s
): Promise<AggregationResponse | null> {
  const races = RACES.join(",");
  let url =
    `${HMDA_BASE}/v2/data-browser-api/view/aggregations?leis=${lei}&${geoParam(state, msa)}` +
    `&years=${years}&actions_taken=${ACTION_ORIGINATED},${ACTION_DENIED}` +
    `&races=${encodeURIComponent(races)}`;
  if (incomeLower !== undefined) url += `&income_lower_bound=${incomeLower}`;
  if (incomeUpper !== undefined) url += `&income_upper_bound=${incomeUpper}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data: AggregationResponse = await res.json();
    // If the API ignored the filter the result would be same as unfiltered;
    // return it anyway — the caller validates meaningful data.
    return data;
  } catch {
    return null;
  }
}
