import { describe, expect, it } from "vitest";
import { buildAttestationMetadataURI, prepareAttestation } from "./contract";
import { computeStrategyReportProof } from "@/lib/strategy/proof";
import { strategyReportHashVersion, type StrategyReport } from "@/lib/strategy/types";

describe("on-chain attestation", () => {
  it("builds self-contained metadata and encoded calldata when a registry is configured", () => {
    const previousAddress = process.env.NEXT_PUBLIC_STRATEGY_REGISTRY_ADDRESS;
    process.env.NEXT_PUBLIC_STRATEGY_REGISTRY_ADDRESS = "0x000000000000000000000000000000000000dEaD";

    const report = makeReport();
    const metadataURI = buildAttestationMetadataURI(report);
    const tx = prepareAttestation(report);

    expect(metadataURI.startsWith("data:application/json;base64,")).toBe(true);
    expect(tx.configured).toBe(true);
    if (tx.configured) {
      expect(tx.to).toBe("0x000000000000000000000000000000000000dEaD");
      expect(tx.data.startsWith("0x")).toBe(true);
      expect(tx.metadataURI).toBe(metadataURI);
    }

    process.env.NEXT_PUBLIC_STRATEGY_REGISTRY_ADDRESS = previousAddress;
  });

  it("returns an actionable setup message when no registry is configured", () => {
    const previousAddress = process.env.NEXT_PUBLIC_STRATEGY_REGISTRY_ADDRESS;
    process.env.NEXT_PUBLIC_STRATEGY_REGISTRY_ADDRESS = "";

    const tx = prepareAttestation(makeReport());

    expect(tx.configured).toBe(false);
    if (!tx.configured) {
      expect(tx.message).toContain("NEXT_PUBLIC_STRATEGY_REGISTRY_ADDRESS");
    }

    process.env.NEXT_PUBLIC_STRATEGY_REGISTRY_ADDRESS = previousAddress;
  });

  it("rejects reports whose canonical payload does not match the published hash", () => {
    const previousAddress = process.env.NEXT_PUBLIC_STRATEGY_REGISTRY_ADDRESS;
    process.env.NEXT_PUBLIC_STRATEGY_REGISTRY_ADDRESS = "0x000000000000000000000000000000000000dEaD";
    const report = makeReport();
    const tampered = {
      ...report,
      metrics: {
        ...report.metrics,
        totalReturnPct: report.metrics.totalReturnPct + 1
      }
    };

    expect(() => prepareAttestation(tampered)).toThrow("hash does not match");

    process.env.NEXT_PUBLIC_STRATEGY_REGISTRY_ADDRESS = previousAddress;
  });
});

function makeReport(): StrategyReport {
  const report = {
    id: "test-report",
    createdAt: "2026-06-18T00:00:00.000Z",
    prompt: "Build a BTC strategy.",
    engine: {
      planSource: "openai",
      dataProvider: "CoinMarketCap",
      candleInterval: "daily",
      quoteSource: "CoinMarketCap /v2/cryptocurrency/quotes/latest",
      executionFeeBps: 10,
      executionSlippageBps: 5,
      hashVersion: strategyReportHashVersion
    },
    intent: {
      assetSymbol: "BTC",
      assetName: "Bitcoin",
      timeframe: "daily",
      riskProfile: "balanced",
      strategyType: "momentum",
      marketRegime: "any",
      capitalUsd: 10_000,
      lookbackDays: 90
    },
    strategy: {
      name: "BTC Momentum",
      thesis: "Momentum rules test trend continuation with controlled risk.",
      entryRules: ["Fast EMA above slow EMA", "MACD histogram positive"],
      exitRules: ["Take profit hit", "Stop loss hit"],
      invalidationRules: ["Do not use after liquidity shocks"],
      indicators: ["EMA", "MACD", "RSI"],
      parameters: {
        rsiPeriod: 14,
        rsiEntry: 40,
        rsiExit: 65,
        emaFast: 21,
        emaSlow: 55,
        macdFast: 12,
        macdSlow: 26,
        macdSignal: 9,
        atrPeriod: 14,
        stopLossPct: 5,
        takeProfitPct: 11,
        maxHoldingPeriods: 30
      },
      explanationSeed: "Test explanation seed"
    },
    market: {
      cmcId: 1,
      symbol: "BTC",
      name: "Bitcoin",
      price: 100_000,
      dataSource: "CoinMarketCap /v2/cryptocurrency/quotes/latest"
    },
    candles: [],
    metrics: {
      startingCapital: 10_000,
      endingCapital: 10_500,
      totalReturnPct: 5,
      cagrPct: 10,
      winRatePct: 50,
      sharpe: 1.2,
      sortino: 1.4,
      maxDrawdownPct: 6,
      profitFactor: 1.8,
      trades: 4,
      exposurePct: 40
    },
    risk: {
      riskScore: 38,
      volatilityAnnualizedPct: 52,
      suggestedAllocationPct: 12,
      suggestedMaxLeverage: 1.5,
      stopLossPct: 5,
      notes: ["Test risk note"]
    },
    trades: [],
    equityCurve: [],
    optimizedVariants: [],
    explanation: {
      summary: "Test summary",
      whyItShouldWork: ["Test why"],
      failureModes: ["Test failure"],
      nextResearchSteps: ["Test next step"]
    },
  } satisfies Omit<StrategyReport, "onchain">;
  return {
    ...report,
    onchain: computeStrategyReportProof(report)
  };
}
