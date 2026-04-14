/**
 * /api/stratified — Controlled disparity analysis
 *
 * Returns denial-rate disparity ratios stratified by loan type and loan
 * purpose, income bands (where the HMDA API supports it), plus CMH
 * cross-stratum test statistics and per-group power analysis.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  getDisparityData,
  getStratifiedDisparityData,
  getIncomeBandDisparityData,
  LOAN_TYPES,
  LOAN_TYPE_LABELS,
  LOAN_PURPOSES,
} from "@/lib/hmda";
import {
  computeDenialRates,
  computeDisparityRatios,
  DenialRateEntry,
  DisparityRatio,
} from "@/lib/computations";
import {
  cochranMantelHaenszel,
  minimumDetectableRatio,
  CMHStratum,
} from "@/lib/statistics";

// Income bands in $1,000s (lower_bound, upper_bound, label)
const INCOME_BANDS: { lower?: number; upper?: number; label: string }[] = [
  { upper: 50,  label: "≤$50K" },
  { lower: 51,  upper: 75,  label: "$51K–$75K" },
  { lower: 76,  upper: 100, label: "$76K–$100K" },
  { lower: 101, upper: 150, label: "$101K–$150K" },
  { lower: 151, label: ">$150K" },
];

interface StratumResult {
  label: string;
  denialRates: DenialRateEntry[];
  disparityRatios: DisparityRatio[];
  /** Total applications across all racial groups in this stratum */
  totalApplications: number;
}

function buildCMHStrata(
  stratumResults: StratumResult[],
  minorityGroup: string
): CMHStratum[] {
  return stratumResults
    .map((sr) => {
      const minority = sr.denialRates.find((r) => r.group === minorityGroup);
      const white = sr.denialRates.find((r) => r.group === "White");
      if (!minority || !white) return null;
      return {
        a: minority.denials,
        b: minority.originations,
        c: white.denials,
        d: white.originations,
        label: sr.label,
      } satisfies CMHStratum;
    })
    .filter((s): s is CMHStratum => s !== null);
}

export async function GET(req: NextRequest) {
  const lei = req.nextUrl.searchParams.get("lei");
  const state = req.nextUrl.searchParams.get("state") || undefined;
  const msa = req.nextUrl.searchParams.get("msa") || undefined;
  const years =
    req.nextUrl.searchParams.get("years") ||
    req.nextUrl.searchParams.get("year") ||
    "2023";

  if (!lei || (!state && !msa)) {
    return NextResponse.json(
      { error: "lei and either state or msa are required" },
      { status: 400 }
    );
  }

  try {
    // ── Overall (unfiltered) ─────────────────────────────────────────────────
    const overallData = await getDisparityData(lei, years, state, msa);
    const overallRates = computeDenialRates(overallData);
    const overallRatios = computeDisparityRatios(overallRates);

    // ── Loan type strata ─────────────────────────────────────────────────────
    const loanTypeEntries = Object.entries(LOAN_TYPES) as [
      keyof typeof LOAN_TYPES,
      string,
    ][];

    const loanTypeResults = await Promise.all(
      loanTypeEntries.map(async ([, code]) => {
        try {
          const data = await getStratifiedDisparityData(
            lei, years, state, msa, code
          );
          const rates = computeDenialRates(data);
          const ratios = computeDisparityRatios(rates);
          return {
            label: LOAN_TYPE_LABELS[code] ?? code,
            loanType: code,
            denialRates: rates,
            disparityRatios: ratios,
            totalApplications: rates.reduce((s, r) => s + r.applications, 0),
          };
        } catch {
          return null;
        }
      })
    );

    const loanTypeStrata = loanTypeResults.filter(
      (r): r is NonNullable<typeof r> => r !== null && r.totalApplications > 0
    );

    // Conventional purchase is the most legally significant stratum
    const conventionalData = await getStratifiedDisparityData(
      lei, years, state, msa,
      LOAN_TYPES.CONVENTIONAL,
      LOAN_PURPOSES.PURCHASE
    ).catch(() => null);

    let conventionalPurchase: StratumResult | null = null;
    if (conventionalData) {
      const rates = computeDenialRates(conventionalData);
      const ratios = computeDisparityRatios(rates);
      conventionalPurchase = {
        label: "Conventional Purchase",
        denialRates: rates,
        disparityRatios: ratios,
        totalApplications: rates.reduce((s, r) => s + r.applications, 0),
      };
    }

    // ── Income band strata ───────────────────────────────────────────────────
    const incomeBandResults = await Promise.all(
      INCOME_BANDS.map(async (band) => {
        const data = await getIncomeBandDisparityData(
          lei, years, state, msa, band.lower, band.upper
        );
        if (!data) return null;
        const rates = computeDenialRates(data);
        const ratios = computeDisparityRatios(rates);
        const total = rates.reduce((s, r) => s + r.applications, 0);
        if (total < 20) return null;
        return {
          label: band.label,
          denialRates: rates,
          disparityRatios: ratios,
          totalApplications: total,
        };
      })
    );

    const incomeBandStrata = incomeBandResults.filter(
      (r): r is NonNullable<typeof r> => r !== null
    );
    const incomeBandsAvailable = incomeBandStrata.length > 0;

    // ── CMH tests ────────────────────────────────────────────────────────────
    // Get all minority groups present in the overall data
    const minorityGroups = overallRatios.map((r) => r.group);

    // CMH across loan type strata
    const loanTypeCMH = minorityGroups.map((group) => {
      const strata = buildCMHStrata(loanTypeStrata, group);
      const label = overallRatios.find((r) => r.group === group)?.label ?? group;
      return { group, label, cmh: cochranMantelHaenszel(strata) };
    });

    // CMH across income band strata (if data available)
    const incomeBandCMH = incomeBandsAvailable
      ? minorityGroups.map((group) => {
          const strata = buildCMHStrata(incomeBandStrata, group);
          const label =
            overallRatios.find((r) => r.group === group)?.label ?? group;
          return { group, label, cmh: cochranMantelHaenszel(strata) };
        })
      : null;

    // ── Power analysis (per minority group, overall data) ────────────────────
    const whiteRates = overallRates.find((r) => r.group === "White");
    const powerAnalysis = overallRates
      .filter((r) => r.group !== "White")
      .map((r) => {
        const mde = whiteRates
          ? minimumDetectableRatio(r.applications, whiteRates.applications, whiteRates.denialRate)
          : null;
        return { group: r.group, label: r.label, applications: r.applications, mde };
      });

    return NextResponse.json({
      overall: overallRatios,
      conventionalPurchase,
      loanTypeStrata,
      incomeBandStrata: incomeBandsAvailable ? incomeBandStrata : [],
      incomeBandsAvailable,
      loanTypeCMH,
      incomeBandCMH,
      powerAnalysis,
      years,
      state,
      msa,
      lei,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
