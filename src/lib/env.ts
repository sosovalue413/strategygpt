export function getServerEnv() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return {
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL ?? "gpt-5.5",
    coinMarketCapApiKey: process.env.COINMARKETCAP_API_KEY,
    coinMarketCapBaseUrl: process.env.COINMARKETCAP_BASE_URL ?? "https://pro-api.coinmarketcap.com",
    appUrl,
    defaultChainId: Number(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID ?? "11155111"),
    strategyRegistryAddress: process.env.NEXT_PUBLIC_STRATEGY_REGISTRY_ADDRESS,
    apiToken: process.env.STRATEGYGPT_API_TOKEN,
    databaseUrl: process.env.DATABASE_URL,
    upstashRedisRestUrl: process.env.UPSTASH_REDIS_REST_URL,
    upstashRedisRestToken: process.env.UPSTASH_REDIS_REST_TOKEN,
    executionFeeBps: Number(process.env.EXECUTION_FEE_BPS ?? "10"),
    executionSlippageBps: Number(process.env.EXECUTION_SLIPPAGE_BPS ?? "5")
  };
}

export function requireServerEnv(name: "OPENAI_API_KEY" | "COINMARKETCAP_API_KEY") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}
