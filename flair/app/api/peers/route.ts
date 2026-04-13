import { NextRequest, NextResponse } from "next/server";
import { getAggregate, getEthnicityAggregate } from "@/lib/hmda";
import { computeDenialRates, computeDisparityRatios, mergeRaceAndEthnicity } from "@/lib/computations";

export async function GET(req: NextRequest) {
  const state = req.nextUrl.searchParams.get("state") || undefined;
  const msa = req.nextUrl.searchParams.get("msa") || undefined;
  const years = req.nextUrl.searchParams.get("years") || req.nextUrl.searchParams.get("year") || "2023";

  if (!state && !msa) {
    return NextResponse.json({ error: "state or msa is required" }, { status: 400 });
  }

  try {
    const [raceData, ethnicityData] = await Promise.all([
      getAggregate(years, state, msa),
      getEthnicityAggregate(years, state, msa),
    ]);

    const raceDenials = computeDenialRates(raceData);
    const ethnicityDenials = computeDenialRates(ethnicityData);
    const allDenials = mergeRaceAndEthnicity(raceDenials, ethnicityDenials);
    const ratios = computeDisparityRatios(allDenials);

    return NextResponse.json({
      denialRates: allDenials,
      disparityRatios: ratios,
      years,
      state,
      msa,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
