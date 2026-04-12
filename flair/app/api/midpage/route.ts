import { NextRequest, NextResponse } from "next/server";
import { searchCaseLaw } from "@/lib/midpage";

export async function GET(req: NextRequest) {
  const lenderName = req.nextUrl.searchParams.get("lender");
  const apiKey = process.env.MIDPAGE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "MIDPAGE_API_KEY not configured" }, { status: 500 });
  }

  if (!lenderName) {
    return NextResponse.json({ error: "lender is required" }, { status: 400 });
  }

  try {
    const data = await searchCaseLaw(lenderName, apiKey);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
