import { NextResponse } from "next/server";
import { z } from "zod";
import { CoinMarketCapError } from "@/lib/cmc/client";
import { requireApiAccess } from "@/lib/server/auth";
import { checkRateLimit, isRequestBodyTooLarge, rateLimitResponse, requestTooLargeResponse } from "@/lib/server/rate-limit";
import { recordApiMetric } from "@/lib/server/telemetry";
import { createStrategyReport } from "@/lib/strategy/report";
import { riskProfileSchema, timeframeSchema } from "@/lib/strategy/types";

const requestSchema = z.object({
  prompt: z.string().min(8).max(1200),
  riskProfile: riskProfileSchema.optional(),
  timeframe: timeframeSchema.optional(),
  capitalUsd: z.number().positive().max(10_000_000).optional(),
  lookbackDays: z.number().int().min(35).max(365).optional()
});

export async function POST(request: Request) {
  const started = Date.now();
  let status = 200;
  try {
    const auth = requireApiAccess(request);
    if (auth) {
      status = 401;
      return auth;
    }
    if (isRequestBodyTooLarge(request, 16_384)) {
      status = 413;
      return requestTooLargeResponse(16_384);
    }
    const rateLimit = await checkRateLimit(request, "strategy-generate", { max: 8, windowMs: 60_000 });
    if (!rateLimit.ok) {
      status = 429;
      return rateLimitResponse(rateLimit);
    }
    const body = requestSchema.parse(await request.json());
    const report = await createStrategyReport(body);
    return NextResponse.json({ report });
  } catch (error) {
    status = error instanceof CoinMarketCapError ? 502 : error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Strategy generation failed.",
        kind: error instanceof CoinMarketCapError ? "coinmarketcap" : error instanceof z.ZodError ? "validation" : "server"
      },
      { status }
    );
  } finally {
    recordApiMetric("/api/strategy/generate", status, Date.now() - started);
  }
}
