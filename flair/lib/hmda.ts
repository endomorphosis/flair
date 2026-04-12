import { HMDA_BASE, RACES, ETHNICITIES, ACTION_ORIGINATED, ACTION_DENIED } from "./constants";

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
}

export interface AggregationResponse {
  parameters: Record<string, string>;
  aggregations: Aggregation[];
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
  state: string,
  year: number
): Promise<AggregationResponse> {
  const races = RACES.join(",");
  const url = `${HMDA_BASE}/v2/data-browser-api/view/aggregations?leis=${lei}&states=${state}&years=${year}&actions_taken=${ACTION_ORIGINATED},${ACTION_DENIED}&races=${encodeURIComponent(races)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Aggregation API error: ${res.status}`);
  return res.json();
}

export async function getEthnicityData(
  lei: string,
  state: string,
  year: number
): Promise<AggregationResponse> {
  const ethnicities = ETHNICITIES.join(",");
  const url = `${HMDA_BASE}/v2/data-browser-api/view/aggregations?leis=${lei}&states=${state}&years=${year}&actions_taken=${ACTION_ORIGINATED},${ACTION_DENIED}&ethnicities=${encodeURIComponent(ethnicities)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Ethnicity API error: ${res.status}`);
  return res.json();
}

export async function getStateAggregate(
  state: string,
  year: number
): Promise<AggregationResponse> {
  const races = RACES.join(",");
  const url = `${HMDA_BASE}/v2/data-browser-api/view/aggregations?states=${state}&years=${year}&actions_taken=${ACTION_ORIGINATED},${ACTION_DENIED}&races=${encodeURIComponent(races)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`State aggregate API error: ${res.status}`);
  return res.json();
}

export async function getStateEthnicityAggregate(
  state: string,
  year: number
): Promise<AggregationResponse> {
  const ethnicities = ETHNICITIES.join(",");
  const url = `${HMDA_BASE}/v2/data-browser-api/view/aggregations?states=${state}&years=${year}&actions_taken=${ACTION_ORIGINATED},${ACTION_DENIED}&ethnicities=${encodeURIComponent(ethnicities)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`State ethnicity aggregate API error: ${res.status}`);
  return res.json();
}
