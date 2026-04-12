import { NextRequest, NextResponse } from "next/server";
import { searchByQuery } from "@/lib/midpage";

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
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
