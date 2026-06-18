import { z } from "zod";

export const riskProfileSchema = z.enum(["conservative", "balanced", "aggressive"]);
export const strategyTypeSchema = z.enum(["momentum", "mean_reversion", "trend", "breakout", "swing"]);
export const timeframeSchema = z.enum(["daily"]);
export const marketRegimeSchema = z.enum(["bull", "bear", "volatile", "range", "any"]);
export const strategyReportHashVersion = "strategy-report-v2";

export const strategyIntentSchema = z.object({
  assetSymbol: z.string().min(2).max(12).transform((value) => value.trim().toUpperCase()),
  assetName: z.string().optional(),
  timeframe: timeframeSchema,
  riskProfile: riskProfileSchema,
  strategyType: strategyTypeSchema,
  marketRegime: marketRegimeSchema,
  capitalUsd: z.number().positive().max(10_000_000).default(10_000),
  lookbackDays: z.number().int().min(35).max(365).default(180)
});

export const strategyParametersSchema = z.object({
  rsiPeriod: z.number().int().min(2).max(50),
  rsiEntry: z.number().min(5).max(75),
  rsiExit: z.number().min(25).max(95),
  emaFast: z.number().int().min(2).max(80),
  emaSlow: z.number().int().min(10).max(260),
  macdFast: z.number().int().min(2).max(40),
  macdSlow: z.number().int().min(8).max(80),
  macdSignal: z.number().int().min(2).max(30),
  atrPeriod: z.number().int().min(2).max(50),
  stopLossPct: z.number().min(0.5).max(40),
  takeProfitPct: z.number().min(0.5).max(80),
  maxHoldingPeriods: z.number().int().min(1).max(180)
});

export const generatedStrategySchema = z.object({
  name: z.string().min(3).max(80),
  thesis: z.string().min(12).max(420),
  entryRules: z.array(z.string().min(3)).min(2).max(6),
  exitRules: z.array(z.string().min(3)).min(2).max(6),
  invalidationRules: z.array(z.string().min(3)).min(1).max(5),
  indicators: z.array(z.enum(["RSI", "EMA", "MACD", "ATR", "VWAP", "Bollinger", "Momentum", "Volume"])).min(2),
  parameters: strategyParametersSchema,
  explanationSeed: z.string().min(12).max(700)
});

export const candleSchema = z.object({
  timestamp: z.string(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number()
});

export const tradeSchema = z.object({
  entryTime: z.string(),
  exitTime: z.string(),
  entryPrice: z.number(),
  exitPrice: z.number(),
  returnPct: z.number(),
  reason: z.string(),
  holdingPeriods: z.number()
});

export const equityPointSchema = z.object({
  timestamp: z.string(),
  equity: z.number(),
  close: z.number()
});

export const backtestMetricsSchema = z.object({
  startingCapital: z.number(),
  endingCapital: z.number(),
  totalReturnPct: z.number(),
  cagrPct: z.number(),
  winRatePct: z.number(),
  sharpe: z.number(),
  sortino: z.number(),
  maxDrawdownPct: z.number(),
  profitFactor: z.number(),
  trades: z.number(),
  exposurePct: z.number()
});

export const riskAnalysisSchema = z.object({
  riskScore: z.number().min(0).max(100),
  volatilityAnnualizedPct: z.number(),
  suggestedAllocationPct: z.number(),
  suggestedMaxLeverage: z.number(),
  stopLossPct: z.number(),
  notes: z.array(z.string())
});

export const optimizedVariantSchema = z.object({
  label: z.string(),
  score: z.number(),
  parameters: strategyParametersSchema,
  metrics: backtestMetricsSchema
});

export const marketSnapshotSchema = z.object({
  cmcId: z.number(),
  symbol: z.string(),
  name: z.string(),
  price: z.number(),
  marketCap: z.number().optional(),
  volume24h: z.number().optional(),
  percentChange24h: z.number().optional(),
  fearGreed: z
    .object({
      value: z.number(),
      classification: z.string(),
      updateTime: z.string().optional()
    })
    .optional(),
  dataSource: z.string()
});

export const strategyReportSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  prompt: z.string(),
  engine: z
    .object({
      planSource: z.enum(["openai", "local-fallback"]),
      planWarning: z.string().optional(),
      dataProvider: z.literal("CoinMarketCap"),
      candleInterval: z.literal("daily"),
      quoteSource: z.string(),
      executionFeeBps: z.number(),
      executionSlippageBps: z.number(),
      hashVersion: z.literal(strategyReportHashVersion)
    })
    .default({
      planSource: "local-fallback",
      dataProvider: "CoinMarketCap",
      candleInterval: "daily",
      quoteSource: "CoinMarketCap",
      executionFeeBps: 10,
      executionSlippageBps: 5,
      hashVersion: strategyReportHashVersion
    }),
  intent: strategyIntentSchema,
  strategy: generatedStrategySchema,
  market: marketSnapshotSchema,
  candles: z.array(candleSchema),
  metrics: backtestMetricsSchema,
  risk: riskAnalysisSchema,
  trades: z.array(tradeSchema),
  equityCurve: z.array(equityPointSchema),
  optimizedVariants: z.array(optimizedVariantSchema),
  explanation: z.object({
    summary: z.string(),
    whyItShouldWork: z.array(z.string()),
    failureModes: z.array(z.string()),
    nextResearchSteps: z.array(z.string())
  }),
  onchain: z.object({
    strategyHash: z.string(),
    canonicalJson: z.string()
  })
});

export type RiskProfile = z.infer<typeof riskProfileSchema>;
export type StrategyType = z.infer<typeof strategyTypeSchema>;
export type Timeframe = z.infer<typeof timeframeSchema>;
export type MarketRegime = z.infer<typeof marketRegimeSchema>;
export type StrategyIntent = z.infer<typeof strategyIntentSchema>;
export type StrategyParameters = z.infer<typeof strategyParametersSchema>;
export type GeneratedStrategy = z.infer<typeof generatedStrategySchema>;
export type Candle = z.infer<typeof candleSchema>;
export type Trade = z.infer<typeof tradeSchema>;
export type EquityPoint = z.infer<typeof equityPointSchema>;
export type BacktestMetrics = z.infer<typeof backtestMetricsSchema>;
export type RiskAnalysis = z.infer<typeof riskAnalysisSchema>;
export type OptimizedVariant = z.infer<typeof optimizedVariantSchema>;
export type MarketSnapshot = z.infer<typeof marketSnapshotSchema>;
export type StrategyReport = z.infer<typeof strategyReportSchema>;

export type StrategyRunRequest = {
  prompt: string;
  riskProfile?: RiskProfile;
  timeframe?: Timeframe;
  capitalUsd?: number;
  lookbackDays?: number;
};
