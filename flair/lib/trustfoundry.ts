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

// Parse NDJSON stream and extract the citations_ready event
async function parseNDJSON(res: Response): Promise<TFSearchResponse | null> {
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

export async function searchByFactPattern(
  factPattern: string,
  apiKey: string
): Promise<TFSearchResult[]> {
  const res = await fetch(`${TF_BASE}/public/v1/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({
      query: factPattern,
      state: "FED",
      model_type: "case_key_fact",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TrustFoundry API error ${res.status}: ${text}`);
  }

  const data = await parseNDJSON(res);
  return data?.search_results?.slice(0, 5) || [];
}
