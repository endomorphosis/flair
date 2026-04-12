import { NextRequest, NextResponse } from "next/server";
import { getAggregate, getEthnicityAggregate } from "@/lib/hmda";
import { computeDenialRates, computeDisparityRatios, mergeRaceAndEthnicity } from "@/lib/computations";
import { DEFAULT_YEAR } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const state = req.nextUrl.searchParams.get("state") || undefined;
  const msa = req.nextUrl.searchParams.get("msa") || undefined;
  const year = parseInt(req.nextUrl.searchParams.get("year") || String(DEFAULT_YEAR));

  if (!state && !msa) {
    return NextResponse.json({ error: "state or msa is required" }, { status: 400 });
  }

  try {
    const [raceData, ethnicityData] = await Promise.all([
      getAggregate(year, state, msa),
      getEthnicityAggregate(year, state, msa),
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
      msa,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
