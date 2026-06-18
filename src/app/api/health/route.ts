import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { reportStoreMode } from "@/lib/server/report-store";

export const runtime = "nodejs";

export async function GET() {
  const env = getServerEnv();
  return NextResponse.json({
    status: "ok",
    services: {
      openai: Boolean(env.openaiApiKey),
      coinMarketCap: Boolean(env.coinMarketCapApiKey),
      onchainRegistry: Boolean(env.strategyRegistryAddress),
      apiAccessToken: Boolean(env.apiToken),
      reportStore: reportStoreMode(),
      redisRateLimit: Boolean(env.upstashRedisRestUrl && env.upstashRedisRestToken),
      metrics: true
    },
    defaultChainId: env.defaultChainId
  });
}
