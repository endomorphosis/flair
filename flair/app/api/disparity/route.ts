import { NextRequest, NextResponse } from "next/server";
import { getDisparityData, getEthnicityData } from "@/lib/hmda";
import { computeDenialRates, computeDisparityRatios, mergeRaceAndEthnicity } from "@/lib/computations";

export async function GET(req: NextRequest) {
  const lei = req.nextUrl.searchParams.get("lei");
  const state = req.nextUrl.searchParams.get("state") || undefined;
  const msa = req.nextUrl.searchParams.get("msa") || undefined;
  const years = req.nextUrl.searchParams.get("years") || req.nextUrl.searchParams.get("year") || "2023";

  if (!lei || (!state && !msa)) {
    return NextResponse.json({ error: "lei and either state or msa are required" }, { status: 400 });
  }

  try {
    const [raceData, ethnicityData] = await Promise.all([
      getDisparityData(lei, years, state, msa),
      getEthnicityData(lei, years, state, msa),
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
      lei,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
