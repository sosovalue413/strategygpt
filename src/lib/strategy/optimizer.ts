import { runBacktest } from "./backtest";
import type { Candle, GeneratedStrategy, OptimizedVariant, StrategyIntent, StrategyParameters } from "./types";

type StrategyVariant = {
  label: string;
  strategy: GeneratedStrategy;
};

export type ExecutableStrategyVariant = OptimizedVariant & {
  strategy: GeneratedStrategy;
};

export function optimizeStrategy(candles: Candle[], intent: StrategyIntent, strategy: GeneratedStrategy): OptimizedVariant[] {
  return evaluateParameterVariants(candles, intent, strategy)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

export function findExecutableStrategyVariant(candles: Candle[], intent: StrategyIntent, strategy: GeneratedStrategy): ExecutableStrategyVariant | undefined {
  return evaluateStrategyVariants(candles, intent, strategy)
    .filter((variant) => variant.metrics.trades > 0)
    .sort((a, b) => b.score - a.score)[0];
}

function evaluateStrategyVariants(candles: Candle[], intent: StrategyIntent, strategy: GeneratedStrategy): ExecutableStrategyVariant[] {
  return buildStrategyVariants(strategy, intent).flatMap((strategyVariant, strategyIndex) =>
    evaluateParameterVariants(candles, intent, strategyVariant.strategy).map((variant) => ({
      ...variant,
      label: strategyIndex === 0 ? variant.label : `${strategyVariant.label} / ${variant.label}`,
      strategy: {
        ...strategyVariant.strategy,
        parameters: variant.parameters
      }
    }))
  );
}

function evaluateParameterVariants(candles: Candle[], intent: StrategyIntent, strategy: GeneratedStrategy): OptimizedVariant[] {
  const base = strategy.parameters;
  const candidates = buildParameterVariants(base, intent.riskProfile);

  return candidates
    .map((parameters, index) => {
      const variantStrategy = {
        ...strategy,
        parameters
      };
      const { metrics } = runBacktest(candles, intent, variantStrategy);
      return {
        label: index === 0 ? "Base rules" : `Variant ${index}`,
        score: scoreMetrics(metrics),
        parameters,
        metrics
      };
    })
    .filter((variant) => Number.isFinite(variant.score));
}

function buildStrategyVariants(strategy: GeneratedStrategy, intent: StrategyIntent): StrategyVariant[] {
  const variants: StrategyVariant[] = [{ label: "Base rules", strategy }];
  const relaxedIndicators = essentialIndicators(intent.strategyType);
  const withoutOptionalFilters = strategy.indicators.filter((indicator) => !["Volume", "VWAP", "Bollinger", "Momentum"].includes(indicator));

  for (const indicators of [withoutOptionalFilters, relaxedIndicators]) {
    const uniqueIndicators = [...new Set(indicators)];
    if (uniqueIndicators.length >= 2 && JSON.stringify(uniqueIndicators) !== JSON.stringify(strategy.indicators)) {
      variants.push({
        label: "Relaxed confirmations",
        strategy: {
          ...strategy,
          indicators: uniqueIndicators,
          explanationSeed: `${strategy.explanationSeed} Optional confirmation filters were relaxed because the first pass produced no completed trades.`
        }
      });
    }
  }

  const unique = new Map<string, StrategyVariant>();
  variants.forEach((variant) => {
    unique.set(JSON.stringify({ indicators: variant.strategy.indicators, parameters: variant.strategy.parameters }), variant);
  });
  return [...unique.values()];
}

function essentialIndicators(strategyType: StrategyIntent["strategyType"]): GeneratedStrategy["indicators"] {
  if (strategyType === "breakout") return ["RSI", "MACD", "ATR"];
  if (strategyType === "mean_reversion" || strategyType === "swing") return ["RSI", "EMA", "ATR"];
  return ["RSI", "EMA", "MACD", "ATR"];
}

function buildParameterVariants(base: StrategyParameters, risk: StrategyIntent["riskProfile"]) {
  const stopAdjustments = risk === "conservative" ? [-1, 0, 1] : risk === "aggressive" ? [0, 2, 4] : [-0.5, 0, 1.5];
  const takeProfitAdjustments = risk === "conservative" ? [-1, 0, 2] : risk === "aggressive" ? [0, 4, 8] : [0, 2, 4];
  const rsiAdjustments = [-35, -25, -15, -10, -5, 0, 5, 10, 20];
  const trendPairs = [
    [base.emaFast, base.emaSlow],
    [8, 21],
    [12, 26],
    [21, 55]
  ] as const;
  const macdPairs = [
    [base.macdFast, base.macdSlow, base.macdSignal],
    [8, 17, 9],
    [12, 26, 9]
  ] as const;
  const variants: StrategyParameters[] = [base];

  for (const rsiDelta of rsiAdjustments) {
    for (const stopDelta of stopAdjustments) {
      for (const takeDelta of takeProfitAdjustments) {
        variants.push({
          ...base,
          rsiEntry: clamp(base.rsiEntry + rsiDelta, 10, 65),
          stopLossPct: clamp(base.stopLossPct + stopDelta, 1, 20),
          takeProfitPct: clamp(base.takeProfitPct + takeDelta, 2, 45)
        });
      }
    }
  }

  for (const [emaFast, emaSlow] of trendPairs) {
    for (const [macdFast, macdSlow, macdSignal] of macdPairs) {
      for (const rsiEntry of [30, 35, 40, 45, 50]) {
        variants.push({
          ...base,
          rsiEntry,
          emaFast,
          emaSlow,
          macdFast,
          macdSlow,
          macdSignal,
          stopLossPct: clamp(base.stopLossPct, 1, 20),
          takeProfitPct: clamp(base.takeProfitPct, 2, 45),
          maxHoldingPeriods: clamp(Math.max(base.maxHoldingPeriods, 45), 1, 180)
        });
      }
    }
  }

  const unique = new Map<string, StrategyParameters>();
  variants.forEach((variant) => {
    if (variant.emaFast < variant.emaSlow && variant.macdFast < variant.macdSlow) {
      unique.set(JSON.stringify(variant), variant);
    }
  });
  return [...unique.values()];
}

function scoreMetrics(metrics: OptimizedVariant["metrics"]) {
  return metrics.sharpe * 18 + metrics.sortino * 8 + metrics.totalReturnPct * 0.8 + metrics.winRatePct * 0.25 - metrics.maxDrawdownPct * 1.25;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number(value.toFixed(2))));
}
