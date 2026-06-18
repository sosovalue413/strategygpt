import { z } from "zod";
import { getServerEnv } from "@/lib/env";
import { strategyPlanJsonSchema } from "./json-schema";
import { buildFallbackStrategy, inferIntentFromPrompt } from "./fallback";
import { generatedStrategySchema, strategyIntentSchema, type GeneratedStrategy, type StrategyIntent, type StrategyRunRequest } from "./types";

const strategyPlanSchema = {
  parse(value: unknown) {
    const raw = value as { intent?: unknown; strategy?: unknown };
    return {
      intent: strategyIntentSchema.parse(raw.intent),
      strategy: generatedStrategySchema.parse(raw.strategy)
    };
  }
};

type StrategyPlan = {
  intent: StrategyIntent;
  strategy: GeneratedStrategy;
  source: "openai" | "local-fallback";
  warning?: string;
};

export async function generateStrategyPlan(request: StrategyRunRequest): Promise<StrategyPlan> {
  const fallbackIntent = inferIntentFromPrompt(request);
  const env = getServerEnv();

  if (!env.openaiApiKey) {
    return {
      intent: fallbackIntent,
      strategy: buildFallbackStrategy(fallbackIntent),
      source: "local-fallback",
      warning: "OPENAI_API_KEY is not configured; used deterministic local rule generation."
    };
  }

  try {
    const parsed = await callOpenAIWithRetry(request, fallbackIntent, env.openaiApiKey, env.openaiModel);
    return {
      ...parsed,
      source: "openai"
    };
  } catch (error) {
    const message = formatOpenAIPlanError(error);
    return {
      intent: fallbackIntent,
      strategy: buildFallbackStrategy(fallbackIntent),
      source: "local-fallback",
      warning: `${message} Used deterministic local rule generation.`
    };
  }
}

async function callOpenAIWithRetry(request: StrategyRunRequest, fallbackIntent: StrategyIntent, apiKey: string, model: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await callOpenAIForStrategy(request, fallbackIntent, apiKey, model);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function callOpenAIForStrategy(request: StrategyRunRequest, fallbackIntent: StrategyIntent, apiKey: string, model: string) {
  const input = [
    "You are StrategyGPT AI, a crypto strategy research parser.",
    "Outcome: convert a user's natural-language request into a reproducible long-only spot strategy plan.",
    "Calculations are NOT done by you. Only produce rules and parameters that a deterministic backtester can evaluate.",
    "Do not recommend leverage above the user's risk profile. Do not invent market results.",
    "Use whole percentage points for percent parameters: stopLossPct=5 means 5%, never 0.05. Keep stopLossPct between 0.5 and 40, takeProfitPct between 0.5 and 80, rsiEntry between 5 and 75, and rsiExit between 25 and 95.",
    "Use integer lookbackDays, indicator periods, EMA periods, MACD periods, ATR period, and maxHoldingPeriods.",
    `User prompt: ${request.prompt}`,
    `Defaults to honor when the prompt is ambiguous: asset=${fallbackIntent.assetSymbol}, timeframe=${request.timeframe ?? fallbackIntent.timeframe}, risk=${request.riskProfile ?? fallbackIntent.riskProfile}, capitalUsd=${request.capitalUsd ?? fallbackIntent.capitalUsd}, lookbackDays=${request.lookbackDays ?? fallbackIntent.lookbackDays}.`
  ].join("\n");

  const body = {
    model,
    input,
    reasoning: { effort: "low" },
    text: {
      verbosity: "low",
      format: {
        type: "json_schema",
        name: "strategy_plan",
        strict: true,
        schema: strategyPlanJsonSchema
      }
    }
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    signal: AbortSignal.timeout(35_000),
    body: JSON.stringify(body)
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(readOpenAIError(payload) ?? `OpenAI request failed with ${response.status}.`);
  }

  const text = extractOutputText(payload);
  if (!text) {
    throw new Error("OpenAI returned no parseable strategy text.");
  }

  const parsed = JSON.parse(text);
  const plan = strategyPlanSchema.parse(parsed);
  return {
    intent: {
      ...plan.intent,
      capitalUsd: request.capitalUsd ?? plan.intent.capitalUsd,
      lookbackDays: request.lookbackDays ?? plan.intent.lookbackDays,
      timeframe: request.timeframe ?? plan.intent.timeframe,
      riskProfile: request.riskProfile ?? plan.intent.riskProfile
    },
    strategy: plan.strategy
  };
}

function extractOutputText(payload: unknown): string | undefined {
  const response = payload as {
    output_text?: string;
    output?: Array<{
      content?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
  };
  if (response.output_text) return response.output_text;

  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) {
        return content.text;
      }
    }
  }
  return undefined;
}

function readOpenAIError(payload: unknown) {
  const error = (payload as { error?: { message?: string } }).error;
  return error?.message;
}

function formatOpenAIPlanError(error: unknown) {
  if (error instanceof z.ZodError) {
    const fields = [
      ...new Set(
        error.issues
          .map((issue) => issue.path.join("."))
          .filter(Boolean)
      )
    ].slice(0, 4);
    return `OpenAI returned a strategy plan outside the required schema${fields.length > 0 ? ` (${fields.join(", ")})` : ""}.`;
  }
  if (error instanceof SyntaxError) {
    return "OpenAI returned malformed strategy JSON.";
  }
  return error instanceof Error ? error.message : "OpenAI parser failed.";
}
