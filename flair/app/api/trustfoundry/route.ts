import { NextRequest, NextResponse } from "next/server";
import { searchByFactPattern } from "@/lib/trustfoundry";

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
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
