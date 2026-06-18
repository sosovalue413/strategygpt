import { describe, expect, it } from "vitest";
import { runBacktest } from "./backtest";
import { buildFallbackStrategy, inferIntentFromPrompt } from "./fallback";
import { bollinger, momentum, vwap } from "./indicators";
import { findExecutableStrategyVariant } from "./optimizer";
import type { Candle } from "./types";

describe("runBacktest", () => {
  it("returns deterministic metrics and an equity curve", () => {
    const intent = inferIntentFromPrompt({
      prompt: "Build a balanced BTC momentum strategy.",
      lookbackDays: 90,
      capitalUsd: 10_000
    });
    const strategy = buildFallbackStrategy(intent);
    const candles = makeCandles(90);

    const result = runBacktest(candles, intent, strategy);

    expect(result.equityCurve).toHaveLength(89);
    expect(result.metrics.startingCapital).toBe(10_000);
    expect(Number.isFinite(result.metrics.totalReturnPct)).toBe(true);
    expect(result.risk.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.risk.riskScore).toBeLessThanOrEqual(100);
  });

  it("uses the generated RSI entry parameter in executed entries", () => {
    const intent = inferIntentFromPrompt({
      prompt: "Build a balanced BTC momentum strategy.",
      lookbackDays: 90,
      capitalUsd: 10_000
    });
    const strategy = buildFallbackStrategy(intent);
    const candles = makeCandles(90);
    const loose = runBacktest(candles, intent, {
      ...strategy,
      parameters: {
        ...strategy.parameters,
        rsiEntry: 10
      }
    });
    const strict = runBacktest(candles, intent, {
      ...strategy,
      parameters: {
        ...strategy.parameters,
        rsiEntry: 90
      }
    });

    expect(loose.metrics.trades).toBeGreaterThanOrEqual(strict.metrics.trades);
  });

  it("computes advanced indicator series used by generated strategy confirmations", () => {
    const candles = makeCandles(40);
    const closes = candles.map((candle) => candle.close);
    const vwapSeries = vwap(candles, 20);
    const bands = bollinger(closes, 20);
    const momentumSeries = momentum(closes, 10);

    expect(vwapSeries[19]).toBeGreaterThan(0);
    expect(bands.upper[19]).toBeGreaterThan(bands.middle[19] ?? 0);
    expect(bands.lower[19]).toBeLessThan(bands.middle[19] ?? 0);
    expect(momentumSeries[10]).not.toBeNull();
  });

  it("finds an executable variant when optional confirmation filters block entries", () => {
    const intent = inferIntentFromPrompt({
      prompt: "Build a balanced BTC momentum strategy.",
      lookbackDays: 90,
      capitalUsd: 10_000
    });
    const strategy = buildFallbackStrategy(intent);
    const candles = makeCandles(90).map((candle, index) => ({
      ...candle,
      volume: 2_000_000 - index * 10_000
    }));

    const base = runBacktest(candles, intent, strategy);
    const executable = findExecutableStrategyVariant(candles, intent, strategy);

    expect(base.metrics.trades).toBe(0);
    expect(executable?.metrics.trades).toBeGreaterThan(0);
    expect(executable?.strategy.indicators).not.toContain("Volume");
  });
});

function makeCandles(count: number): Candle[] {
  const start = Date.UTC(2026, 0, 1);
  return Array.from({ length: count }, (_, index) => {
    const base = 100 + index * 0.8 + Math.sin(index / 3) * 4;
    return {
      timestamp: new Date(start + index * 86_400_000).toISOString(),
      open: base - 0.8,
      high: base + 2,
      low: base - 2,
      close: base,
      volume: 1_000_000 + index * 1_000
    };
  });
}
