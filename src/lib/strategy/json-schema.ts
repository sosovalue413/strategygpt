export const strategyPlanJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["intent", "strategy"],
  properties: {
    intent: {
      type: "object",
      additionalProperties: false,
      required: [
        "assetSymbol",
        "assetName",
        "timeframe",
        "riskProfile",
        "strategyType",
        "marketRegime",
        "capitalUsd",
        "lookbackDays"
      ],
      properties: {
        assetSymbol: { type: "string" },
        assetName: { type: "string" },
        timeframe: { type: "string", enum: ["daily"] },
        riskProfile: { type: "string", enum: ["conservative", "balanced", "aggressive"] },
        strategyType: { type: "string", enum: ["momentum", "mean_reversion", "trend", "breakout", "swing"] },
        marketRegime: { type: "string", enum: ["bull", "bear", "volatile", "range", "any"] },
        capitalUsd: { type: "number" },
        lookbackDays: { type: "number" }
      }
    },
    strategy: {
      type: "object",
      additionalProperties: false,
      required: [
        "name",
        "thesis",
        "entryRules",
        "exitRules",
        "invalidationRules",
        "indicators",
        "parameters",
        "explanationSeed"
      ],
      properties: {
        name: { type: "string" },
        thesis: { type: "string" },
        entryRules: { type: "array", items: { type: "string" } },
        exitRules: { type: "array", items: { type: "string" } },
        invalidationRules: { type: "array", items: { type: "string" } },
        indicators: {
          type: "array",
          items: {
            type: "string",
            enum: ["RSI", "EMA", "MACD", "ATR", "VWAP", "Bollinger", "Momentum", "Volume"]
          }
        },
        parameters: {
          type: "object",
          additionalProperties: false,
          required: [
            "rsiPeriod",
            "rsiEntry",
            "rsiExit",
            "emaFast",
            "emaSlow",
            "macdFast",
            "macdSlow",
            "macdSignal",
            "atrPeriod",
            "stopLossPct",
            "takeProfitPct",
            "maxHoldingPeriods"
          ],
          properties: {
            rsiPeriod: { type: "number" },
            rsiEntry: { type: "number" },
            rsiExit: { type: "number" },
            emaFast: { type: "number" },
            emaSlow: { type: "number" },
            macdFast: { type: "number" },
            macdSlow: { type: "number" },
            macdSignal: { type: "number" },
            atrPeriod: { type: "number" },
            stopLossPct: { type: "number" },
            takeProfitPct: { type: "number" },
            maxHoldingPeriods: { type: "number" }
          }
        },
        explanationSeed: { type: "string" }
      }
    }
  }
} as const;
