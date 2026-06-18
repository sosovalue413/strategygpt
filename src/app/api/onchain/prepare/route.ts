import { NextResponse } from "next/server";
import { prepareAttestation } from "@/lib/onchain/contract";
import { requireApiAccess } from "@/lib/server/auth";
import { checkRateLimit, isRequestBodyTooLarge, rateLimitResponse, requestTooLargeResponse } from "@/lib/server/rate-limit";
import { recordApiMetric } from "@/lib/server/telemetry";
import { strategyReportSchema } from "@/lib/strategy/types";

export async function POST(request: Request) {
  const started = Date.now();
  let status = 200;
  try {
    const auth = requireApiAccess(request);
    if (auth) {
      status = 401;
      return auth;
    }
    if (isRequestBodyTooLarge(request, 1_500_000)) {
      status = 413;
      return requestTooLargeResponse(1_500_000);
    }
    const rateLimit = await checkRateLimit(request, "onchain-prepare", { max: 20, windowMs: 60_000 });
    if (!rateLimit.ok) {
      status = 429;
      return rateLimitResponse(rateLimit);
    }
    const report = strategyReportSchema.parse(await request.json());
    return NextResponse.json(prepareAttestation(report));
  } catch (error) {
    status = 400;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to prepare on-chain transaction."
      },
      { status: 400 }
    );
  } finally {
    recordApiMetric("/api/onchain/prepare", status, Date.now() - started);
  }
}
