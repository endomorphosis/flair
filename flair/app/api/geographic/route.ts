import { NextRequest, NextResponse } from "next/server";
import { getCountyDemographics } from "@/lib/census";
import { HMDA_BASE, ACTION_ORIGINATED, ACTION_DENIED } from "@/lib/constants";
import { DEFAULT_YEAR } from "@/lib/constants";

interface CountyGroupCounts {
  applications: number;
  originations: number;
  denials: number;
}

async function getApplicationCounts(
  counties: string[],
  years: string,
  lei?: string
): Promise<CountyGroupCounts> {
  if (counties.length === 0) return { applications: 0, originations: 0, denials: 0 };

  const countyParam = counties.join(",");
  let url = `${HMDA_BASE}/v2/data-browser-api/view/aggregations?counties=${countyParam}&years=${years}&actions_taken=${ACTION_ORIGINATED},${ACTION_DENIED}`;
  if (lei) url += `&leis=${lei}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HMDA API error: ${res.status}`);

  const data = await res.json();
  let originations = 0;
  let denials = 0;

  for (const agg of data.aggregations) {
    if (agg.actions_taken === ACTION_ORIGINATED) originations += agg.count;
    if (agg.actions_taken === ACTION_DENIED) denials += agg.count;
  }

  return { applications: originations + denials, originations, denials };
}

export async function GET(req: NextRequest) {
  const lei = req.nextUrl.searchParams.get("lei");
  const state = req.nextUrl.searchParams.get("state");
  const years = req.nextUrl.searchParams.get("years") || req.nextUrl.searchParams.get("year") || String(DEFAULT_YEAR);

  if (!lei || !state) {
    return NextResponse.json({ error: "lei and state are required" }, { status: 400 });
  }

  try {
    // 1. Get county demographics from Census
    const counties = await getCountyDemographics(state);

    // 2. Query HMDA for lender's applications in each group
    const [lenderMM, lenderMW, marketMM, marketMW] = await Promise.all([
      getApplicationCounts(counties.majorityMinorityFips, years, lei),
      getApplicationCounts(counties.majorityWhiteFips, years, lei),
      getApplicationCounts(counties.majorityMinorityFips, years),
      getApplicationCounts(counties.majorityWhiteFips, years),
    ]);

    const lenderTotal = lenderMM.applications + lenderMW.applications;
    const marketTotal = marketMM.applications + marketMW.applications;

    const lenderMmPct = lenderTotal > 0 ? (lenderMM.applications / lenderTotal) * 100 : 0;
    const marketMmPct = marketTotal > 0 ? (marketMM.applications / marketTotal) * 100 : 0;

    const lenderMmDenialRate = lenderMM.applications > 0 ? (lenderMM.denials / lenderMM.applications) * 100 : 0;
    const lenderMwDenialRate = lenderMW.applications > 0 ? (lenderMW.denials / lenderMW.applications) * 100 : 0;

    return NextResponse.json({
      lender: {
        majorityMinority: lenderMM,
        majorityWhite: lenderMW,
        total: lenderTotal,
        mmPct: lenderMmPct,
        mmDenialRate: lenderMmDenialRate,
        mwDenialRate: lenderMwDenialRate,
      },
      market: {
        majorityMinority: marketMM,
        majorityWhite: marketMW,
        total: marketTotal,
        mmPct: marketMmPct,
      },
      gap: lenderMmPct - marketMmPct,
      counties: {
        majorityMinorityCount: counties.majorityMinority.length,
        majorityWhiteCount: counties.majorityWhite.length,
        totalCounties: counties.majorityMinority.length + counties.majorityWhite.length,
      },
      years,
      state,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
