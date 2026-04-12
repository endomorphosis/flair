import { NextRequest, NextResponse } from "next/server";
import { getStateAggregate, getStateEthnicityAggregate } from "@/lib/hmda";
import { computeDenialRates, computeDisparityRatios, mergeRaceAndEthnicity } from "@/lib/computations";
import { DEFAULT_YEAR } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const state = req.nextUrl.searchParams.get("state");
  const year = parseInt(req.nextUrl.searchParams.get("year") || String(DEFAULT_YEAR));

  if (!state) {
    return NextResponse.json({ error: "state is required" }, { status: 400 });
  }

  try {
    const [raceData, ethnicityData] = await Promise.all([
      getStateAggregate(state, year),
      getStateEthnicityAggregate(state, year),
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
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
