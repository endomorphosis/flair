import { NextRequest, NextResponse } from "next/server";
import { searchByFactPattern, describeCaseResult } from "@/lib/trustfoundry";

export async function GET(req: NextRequest) {
  const factPattern = req.nextUrl.searchParams.get("facts");
  const apiKey = process.env.TRUSTFOUNDRY_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "TRUSTFOUNDRY_API_KEY not configured" }, { status: 500 });
  }

  if (!factPattern) {
    return NextResponse.json({ error: "facts parameter is required" }, { status: 400 });
  }

  try {
    const results = await searchByFactPattern(factPattern, apiKey);

    // Prefetch descriptions for case-type results
    const enriched = await Promise.all(
      results.map(async (r) => {
        if (r.result_type === "case") {
          const desc = await describeCaseResult(r.uuid, apiKey).catch(() => null);
          return { ...r, caseDescription: desc?.description || null };
        }
        return { ...r, caseDescription: null };
      })
    );

    return NextResponse.json({ results: enriched });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
