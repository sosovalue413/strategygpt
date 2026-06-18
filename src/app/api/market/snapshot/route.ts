import { NextResponse } from "next/server";
import { getFearGreedLatest, getMarketSnapshot, getTopListings, getTrendingAssets } from "@/lib/cmc/client";
import { requireApiAccess } from "@/lib/server/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/server/rate-limit";
import { recordApiMetric } from "@/lib/server/telemetry";

export async function GET(request: Request) {
  const started = Date.now();
  let status = 200;
  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol") ?? "BTC";
  const auth = requireApiAccess(request);
  if (auth) {
    recordApiMetric("/api/market/snapshot", 401, Date.now() - started);
    return auth;
  }
  const rateLimit = await checkRateLimit(request, "market-snapshot", { max: 60, windowMs: 60_000 });
  if (!rateLimit.ok) {
    status = 429;
    recordApiMetric("/api/market/snapshot", status, Date.now() - started);
    return rateLimitResponse(rateLimit);
  }

  try {
    const [selected, listings, fearGreed, trending] = await Promise.all([getMarketSnapshot(symbol), getTopListings(12), getFearGreedLatest(), getTrendingAssets(8)]);
    return NextResponse.json({
      selected: selected.market,
      listings,
      fearGreed,
      trending,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    status = 502;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Market snapshot failed."
      },
      { status: 502 }
    );
  } finally {
    recordApiMetric("/api/market/snapshot", status, Date.now() - started);
  }
}
