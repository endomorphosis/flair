import { NextRequest, NextResponse } from "next/server";
import { searchByQuery, getOpinionDetails } from "@/lib/midpage";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query");
  const apiKey = process.env.MIDPAGE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "MIDPAGE_API_KEY not configured" }, { status: 500 });
  }

  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  try {
    const data = await searchByQuery(query, apiKey);

    // Prefetch opinion details for richer metadata
    const opinionIds = data.results.map((r) => r.opinion_id);
    const opinions = opinionIds.length > 0
      ? await getOpinionDetails(opinionIds, apiKey).catch(() => [])
      : [];

    // Merge opinion details into search results
    const enriched = data.results.map((r) => {
      const opinion = opinions.find((o) => o.id === r.opinion_id);
      return {
        ...r,
        citations: opinion?.citations || [],
        citation_count: opinion?.citation_count,
        overall_treatment: opinion?.overall_treatment,
        judge_name: opinion?.judge_name,
      };
    });

    return NextResponse.json({ ...data, results: enriched });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
