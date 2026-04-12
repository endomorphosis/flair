import { NextResponse } from "next/server";
import { searchFairLendingStatutes } from "@/lib/trustfoundry";

export async function GET() {
  const apiKey = process.env.TRUSTFOUNDRY_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "TRUSTFOUNDRY_API_KEY not configured" }, { status: 500 });
  }

  try {
    const results = await searchFairLendingStatutes(apiKey);
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
