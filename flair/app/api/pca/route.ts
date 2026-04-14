/**
 * /api/pca — PCA-based variance decomposition for a single lender.
 *
 * Fetches five HMDA data sources in parallel, builds per-racial-group feature
 * vectors, runs PCA across groups, and applies a Kitagawa-Blinder-Oaxaca (KBO)
 * gap decomposition that partitions the raw denial-rate gap by race into:
 *
 *   • Composition effect (disparate impact):   gap attributable to different
 *     loan-type distributions across racial groups.
 *   • Treatment effect (disparate treatment):  gap within the same loan type —
 *     the strongest legally available evidence of intentional discrimination.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  getDisparityData,
  getLoanTypeMixByRace,
  getLoanPurposeMixByRace,
  getOccupancyMixByRace,
} from "@/lib/hmda";
import { computeVarianceDecomposition } from "@/lib/variance-decomposition";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lei = searchParams.get("lei");
  const state = searchParams.get("state") ?? undefined;
  const msa = searchParams.get("msa") ?? undefined;
  const years = searchParams.get("years") ?? "2023";

  if (!lei) {
    return NextResponse.json({ error: "lei is required" }, { status: 400 });
  }
  if (!state && !msa) {
    return NextResponse.json(
      { error: "state or msa is required" },
      { status: 400 }
    );
  }

  try {
    // Fetch all required data in parallel; gracefully handle optional sources
    const [overall, loanType, loanPurpose, occupancy] = await Promise.all([
      getDisparityData(lei, years, state, msa),
      getLoanTypeMixByRace(lei, years, state, msa),
      getLoanPurposeMixByRace(lei, years, state, msa).catch(() => null),
      getOccupancyMixByRace(lei, years, state, msa).catch(() => null),
    ]);

    const result = computeVarianceDecomposition({
      overall,
      loanType,
      loanPurpose,
      occupancy,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
