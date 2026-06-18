import type { GeneratedStrategy, StrategyIntent, StrategyRunRequest } from "./types";

const assetPattern = /\b(BTC|ETH|SOL|BNB|XRP|ADA|DOGE|AVAX|LINK|MATIC|DOT|ARB|OP|PEPE)\b/i;

export function inferIntentFromPrompt(request: StrategyRunRequest): StrategyIntent {
  const prompt = request.prompt.toLowerCase();
  const assetSymbol = request.prompt.match(assetPattern)?.[1]?.toUpperCase() ?? "BTC";
  const riskProfile =
    request.riskProfile ??
    (prompt.includes("high-risk") || prompt.includes("aggressive")
      ? "aggressive"
      : prompt.includes("low-risk") || prompt.includes("conservative")
        ? "conservative"
        : "balanced");
  const strategyType =
    prompt.includes("mean") || prompt.includes("oversold")
      ? "mean_reversion"
      : prompt.includes("breakout")
        ? "breakout"
        : prompt.includes("trend")
          ? "trend"
          : prompt.includes("swing")
            ? "swing"
            : "momentum";
  const marketRegime =
    prompt.includes("bear")
      ? "bear"
      : prompt.includes("bull")
        ? "bull"
        : prompt.includes("volatile") || prompt.includes("volatility")
          ? "volatile"
          : prompt.includes("range")
            ? "range"
            : "any";

  return {
    assetSymbol,
    assetName: assetSymbol,
    timeframe: "daily",
    riskProfile,
    strategyType,
    marketRegime,
    capitalUsd: request.capitalUsd ?? 10_000,
    lookbackDays: request.lookbackDays ?? 180
  };
}

export function buildFallbackStrategy(intent: StrategyIntent): GeneratedStrategy {
  const conservative = intent.riskProfile === "conservative";
  const aggressive = intent.riskProfile === "aggressive";
  const parameters = {
    rsiPeriod: 14,
    rsiEntry: conservative ? 34 : aggressive ? 45 : 39,
    rsiExit: conservative ? 58 : aggressive ? 70 : 64,
    emaFast: aggressive ? 12 : 21,
    emaSlow: conservative ? 100 : 55,
    macdFast: 12,
    macdSlow: 26,
    macdSignal: 9,
    atrPeriod: 14,
    stopLossPct: conservative ? 3 : aggressive ? 8 : 5,
    takeProfitPct: conservative ? 7 : aggressive ? 18 : 11,
    maxHoldingPeriods: 30
  };

  return {
    name: `${intent.assetSymbol} ${labelForType(intent.strategyType)} strategy`,
    thesis: `${intent.assetSymbol} is tested with ${intent.strategyType.replace("_", " ")} rules, ${intent.riskProfile} position sizing, and exits that prioritize reproducible risk over prediction.`,
    entryRules: [
      `RSI confirms ${intent.strategyType === "mean_reversion" ? "oversold recovery" : "momentum strength"}`,
      "Fast EMA must support the entry direction",
      "MACD histogram must agree with the selected regime"
    ],
    exitRules: [
      `Take profit at ${parameters.takeProfitPct}%`,
      `Stop loss at ${parameters.stopLossPct}%`,
      "Exit when momentum fades or RSI reaches the exit band"
    ],
    invalidationRules: [
      "Do not use if historical data returns fewer than 35 candles",
      "Do not use after a major exchange outage or asset-specific liquidity shock"
    ],
    indicators: ["RSI", "EMA", "MACD", "ATR", "Volume"],
    parameters,
    explanationSeed: "Fallback rules were generated locally because the AI parser was unavailable or returned an invalid plan."
  };
}

function labelForType(type: StrategyIntent["strategyType"]) {
  return type.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
