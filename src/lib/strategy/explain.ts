import type { BacktestMetrics, GeneratedStrategy, RiskAnalysis, StrategyIntent, MarketSnapshot } from "./types";

export function explainStrategy(
  intent: StrategyIntent,
  strategy: GeneratedStrategy,
  market: MarketSnapshot,
  metrics: BacktestMetrics,
  risk: RiskAnalysis,
  parserSource: "openai" | "local-fallback",
  parserWarning?: string
) {
  const sourceLine =
    parserSource === "openai"
      ? "Intent and rule proposal were parsed by OpenAI; calculations were deterministic."
      : parserWarning ?? "Rules were generated locally because the AI parser was unavailable.";

  return {
    summary: `${strategy.name} tested ${market.symbol} with ${intent.strategyType.replace("_", " ")} entries, ${intent.riskProfile} risk controls, and ${metrics.trades} completed trades across the available CMC history. ${sourceLine}`,
    whyItShouldWork: [
      strategy.thesis,
      `The rule stack combines ${strategy.indicators.slice(0, 4).join(", ")} so entry requires both price context and momentum confirmation.`,
      `Risk is capped with a ${strategy.parameters.stopLossPct}% stop and ${strategy.parameters.takeProfitPct}% take-profit before any optional optimization.`
    ],
    failureModes: [
      "A regime shift can invalidate indicator thresholds that worked in the sampled history.",
      "CMC historical access depends on the API plan; a short test window should not be treated as production proof.",
      risk.riskScore > 70
        ? "The current risk score is elevated, so allocation should be reduced before any live experiment."
        : "Risk score is controlled, but position sizing still matters more than signal confidence."
    ],
    nextResearchSteps: [
      "Re-run on a longer lookback and compare against buy-and-hold for the same asset.",
      "Test the top optimized variant out-of-sample before changing live rules.",
      "Publish the strategy hash on-chain only after reviewing the exact canonical JSON."
    ]
  };
}
