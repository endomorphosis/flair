import { NextRequest, NextResponse } from "next/server";
import { searchLenders } from "@/lib/hmda";
import { DEFAULT_YEAR } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  const year = parseInt(req.nextUrl.searchParams.get("year") || String(DEFAULT_YEAR));

  if (!q || q.length < 2) {
    return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 });
  }

  try {
    const lenders = await searchLenders(q, year);
    return NextResponse.json({ lenders });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
