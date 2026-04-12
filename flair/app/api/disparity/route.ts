import { NextRequest, NextResponse } from "next/server";
import { getDisparityData, getEthnicityData } from "@/lib/hmda";
import { computeDenialRates, computeDisparityRatios, mergeRaceAndEthnicity } from "@/lib/computations";
import { DEFAULT_YEAR } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const lei = req.nextUrl.searchParams.get("lei");
  const state = req.nextUrl.searchParams.get("state");
  const year = parseInt(req.nextUrl.searchParams.get("year") || String(DEFAULT_YEAR));

  if (!lei || !state) {
    return NextResponse.json({ error: "lei and state are required" }, { status: 400 });
  }

  try {
    const [raceData, ethnicityData] = await Promise.all([
      getDisparityData(lei, state, year),
      getEthnicityData(lei, state, year),
    ]);

    const raceDenials = computeDenialRates(raceData);
    const ethnicityDenials = computeDenialRates(ethnicityData);
    const allDenials = mergeRaceAndEthnicity(raceDenials, ethnicityDenials);
    const ratios = computeDisparityRatios(allDenials);

    return NextResponse.json({
      denialRates: allDenials,
      disparityRatios: ratios,
      year,
      state,
      lei,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
