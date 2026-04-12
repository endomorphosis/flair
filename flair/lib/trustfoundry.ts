const TF_BASE = "https://api.trustfoundry.ai";

export interface TFSearchResult {
  uuid: string;
  header: string;
  citation_tag: string;
  url: string;
  excerpt: string;
  relevance_score: number;
  result_type: string; // "law", "reg", "case"
  first_level_geo: string;
  second_level_geo: string;
  created_at: string;
}

export interface TFSearchResponse {
  uuid: string;
  query: string;
  created_at: string;
  search_results: TFSearchResult[];
}

// TrustFoundry returns NDJSON stream. We parse it to extract the citations_ready event.
export async function searchStatutes(
  query: string,
  modelType: "law_question" | "reg_question" | "case_question",
  apiKey: string
): Promise<TFSearchResponse | null> {
  const res = await fetch(`${TF_BASE}/public/v1/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({
      query,
      state: "FED",
      model_type: modelType,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TrustFoundry API error ${res.status}: ${text}`);
  }

  // Parse NDJSON stream
  const text = await res.text();
  const lines = text.split("\n").filter((l) => l.trim());

  for (const line of lines) {
    try {
      const event = JSON.parse(line);
      if (event.type === "citations_ready" && event.content) {
        return event.content as TFSearchResponse;
      }
    } catch {
      // skip unparseable lines
    }
  }

  return null;
}

export async function searchFairLendingStatutes(
  apiKey: string
): Promise<TFSearchResult[]> {
  const results: TFSearchResult[] = [];

  // Search for key fair lending statutory provisions
  const queries = [
    {
      query: "Equal Credit Opportunity Act prohibition on discrimination in credit transactions",
      type: "law_question" as const,
    },
    {
      query: "Fair Housing Act prohibition on discrimination in residential real estate transactions mortgage lending",
      type: "law_question" as const,
    },
    {
      query: "Regulation B implementing ECOA prohibition on discrimination credit",
      type: "reg_question" as const,
    },
  ];

  const responses = await Promise.all(
    queries.map((q) =>
      searchStatutes(q.query, q.type, apiKey).catch(() => null)
    )
  );

  for (const resp of responses) {
    if (resp?.search_results) {
      // Take top 2 from each query, deduplicate by header
      for (const r of resp.search_results.slice(0, 2)) {
        if (!results.find((existing) => existing.header === r.header)) {
          results.push(r);
        }
      }
    }
  }

  return results;
}
