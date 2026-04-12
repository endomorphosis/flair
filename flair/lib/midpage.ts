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

export async function searchCaseLaw(
  lenderName: string,
  apiKey: string
): Promise<MidpageSearchResponse> {
  // Search for ECOA/FHA cases mentioning this lender
  const query = `"${lenderName}" AND ("Equal Credit Opportunity Act" OR "ECOA" OR "Fair Housing Act" OR "FHA" OR "disparate impact" OR "fair lending" OR "redlining")`;

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
      page_size: 10,
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
