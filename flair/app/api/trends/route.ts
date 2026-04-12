import { NextRequest, NextResponse } from "next/server";
import { getDisparityData, getEthnicityData } from "@/lib/hmda";
import { computeDenialRates, computeDisparityRatios, mergeRaceAndEthnicity } from "@/lib/computations";

export async function GET(req: NextRequest) {
  const lei = req.nextUrl.searchParams.get("lei");
  const state = req.nextUrl.searchParams.get("state");
  const yearsParam = req.nextUrl.searchParams.get("years") || "2020,2021,2022,2023,2024";

  if (!lei || !state) {
    return NextResponse.json({ error: "lei and state are required" }, { status: 400 });
  }

  const years = yearsParam.split(",").map(Number);

  try {
    const results = await Promise.all(
      years.map(async (year) => {
        try {
          const [raceData, ethnicityData] = await Promise.all([
            getDisparityData(lei, state, year),
            getEthnicityData(lei, state, year),
          ]);
          const raceDenials = computeDenialRates(raceData);
          const ethnicityDenials = computeDenialRates(ethnicityData);
          const allDenials = mergeRaceAndEthnicity(raceDenials, ethnicityDenials);
          const ratios = computeDisparityRatios(allDenials);
          return { year, denialRates: allDenials, disparityRatios: ratios };
        } catch {
          return { year, denialRates: [], disparityRatios: [] };
        }
      })
    );

    return NextResponse.json({ trends: results });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
