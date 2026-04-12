const MIDPAGE_BASE = "https://app.midpage.ai/api/v1";

export interface MidpageResult {
  opinion_id: string;
  score: number;
  case_name: string;
  court_id: string;
  court_name?: string;
  court_abbreviation?: string;
  jurisdiction: string;
  state: string;
  date_filed: string | null;
  snippet: string;
  source: string;
  docket_number?: string;
  publish_status?: string;
}

export interface MidpageSearchResponse {
  results: MidpageResult[];
  pagination: {
    page: number;
    page_size: number;
    total_results: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  metadata: {
    mode: string;
    query: string;
    processing_time_ms: number;
  };
}

export interface MidpageOpinion {
  id: string;
  case_name: string;
  court_id: string;
  court_abbreviation?: string;
  docket_number?: string;
  state: string;
  date_filed: string | null;
  judge_name?: string;
  citations: { cited_as: string; volume: string; reporter: string; page: string }[];
  citation_count?: number;
  overall_treatment?: string;
}

export async function getOpinionDetails(
  opinionIds: string[],
  apiKey: string
): Promise<MidpageOpinion[]> {
  const res = await fetch(`${MIDPAGE_BASE}/opinions/get`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      opinion_ids: opinionIds,
      include_content: false,
      include_detailed_treatments: false,
    }),
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.opinions || [];
}

export async function searchByQuery(
  query: string,
  apiKey: string
): Promise<MidpageSearchResponse> {
  const res = await fetch(`${MIDPAGE_BASE}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      mode: "keyword",
      page: 1,
      page_size: 5,
      filters: {
        jurisdictions: ["Federal Appellate", "Federal District"],
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Midpage API error ${res.status}: ${text}`);
  }

  return res.json();
}
