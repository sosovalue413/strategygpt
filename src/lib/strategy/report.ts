import { randomUUID } from "crypto";
import { getHistoricalCandles, getMarketSnapshot } from "@/lib/cmc/client";
import { explainStrategy } from "./explain";
import { generateStrategyPlan } from "./openai";
import { findExecutableStrategyVariant, optimizeStrategy } from "./optimizer";
import { computeStrategyReportProof } from "./proof";
import { getExecutionAssumptions, runBacktest } from "./backtest";
import { strategyReportHashVersion, strategyReportSchema, type StrategyReport, type StrategyRunRequest } from "./types";

export async function createStrategyReport(request: StrategyRunRequest): Promise<StrategyReport> {
  if (!request.prompt || request.prompt.trim().length < 8) {
    throw new Error("Prompt must describe the strategy you want to research.");
  }

  const plan = await generateStrategyPlan(request);
  const { asset, market } = await getMarketSnapshot(plan.intent.assetSymbol);
  const candles = await getHistoricalCandles(asset, plan.intent.lookbackDays);
  const executionAssumptions = getExecutionAssumptions();
  const executable = selectExecutableStrategy(candles, plan.intent, plan.strategy);
  const optimizedVariants = optimizeStrategy(candles, plan.intent, executable.strategy);
  const planWarning = joinWarnings(plan.warning, executable.warning);
  const explanation = explainStrategy(plan.intent, executable.strategy, market, executable.backtest.metrics, executable.backtest.risk, plan.source, planWarning);
  const baseReport = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    prompt: request.prompt,
    engine: {
      planSource: plan.source,
      planWarning,
      dataProvider: "CoinMarketCap",
      candleInterval: "daily",
      quoteSource: market.dataSource,
      executionFeeBps: executionAssumptions.feeBps,
      executionSlippageBps: executionAssumptions.slippageBps,
      hashVersion: strategyReportHashVersion
    },
    intent: plan.intent,
    strategy: executable.strategy,
    market,
    candles,
    metrics: executable.backtest.metrics,
    risk: executable.backtest.risk,
    trades: executable.backtest.trades,
    equityCurve: executable.backtest.equityCurve,
    optimizedVariants,
    explanation
  } satisfies Omit<StrategyReport, "onchain">;
  const proof = computeStrategyReportProof(baseReport);

  return strategyReportSchema.parse({
    ...baseReport,
    onchain: proof
  });
}

function selectExecutableStrategy(candles: Awaited<ReturnType<typeof getHistoricalCandles>>, intent: Awaited<ReturnType<typeof generateStrategyPlan>>["intent"], strategy: Awaited<ReturnType<typeof generateStrategyPlan>>["strategy"]) {
  const backtest = runBacktest(candles, intent, strategy);
  if (backtest.metrics.trades > 0) {
    return { strategy, backtest };
  }

  const executable = findExecutableStrategyVariant(candles, intent, strategy);
  if (!executable) {
    return {
      strategy,
      backtest,
      warning: "No completed trades were found in this historical window; widen the lookback or loosen entry rules before using this strategy."
    };
  }

  const adjustedStrategy = {
    ...executable.strategy,
    explanationSeed: `${executable.strategy.explanationSeed} Rules were adjusted to the best executable tested variant because the first pass produced no completed trades.`
  };
  return {
    strategy: adjustedStrategy,
    backtest: runBacktest(candles, intent, adjustedStrategy),
    warning: "Initial generated parameters produced no completed trades; the report uses the best executable optimized variant."
  };
}

function joinWarnings(...warnings: Array<string | undefined>) {
  const message = warnings.filter(Boolean).join(" ");
  return message.length > 0 ? message : undefined;
}
