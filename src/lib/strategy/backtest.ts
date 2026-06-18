import { getServerEnv } from "@/lib/env";
import { bollinger, ema, logReturns, macd, mean, momentum, rollingHigh, rollingLow, rsi, sma, standardDeviation, vwap } from "./indicators";
import type {
  BacktestMetrics,
  Candle,
  EquityPoint,
  GeneratedStrategy,
  RiskAnalysis,
  StrategyIntent,
  StrategyParameters,
  Trade
} from "./types";

type BacktestResult = {
  metrics: BacktestMetrics;
  risk: RiskAnalysis;
  trades: Trade[];
  equityCurve: EquityPoint[];
};

const riskAllocation: Record<StrategyIntent["riskProfile"], number> = {
  conservative: 0.35,
  balanced: 0.55,
  aggressive: 0.8
};
const periodsPerYear = 365;

export function getExecutionAssumptions() {
  const env = getServerEnv();
  return {
    feeBps: Number.isFinite(env.executionFeeBps) ? env.executionFeeBps : 10,
    slippageBps: Number.isFinite(env.executionSlippageBps) ? env.executionSlippageBps : 5
  };
}

export function runBacktest(candles: Candle[], intent: StrategyIntent, strategy: GeneratedStrategy): BacktestResult {
  if (candles.length < 35) {
    throw new Error("At least 35 historical candles are required to run a meaningful backtest.");
  }

  const parameters = strategy.parameters;
  const close = candles.map((candle) => candle.close);
  const volumes = candles.map((candle) => candle.volume);
  const rsiSeries = rsi(close, parameters.rsiPeriod);
  const emaFast = ema(close, parameters.emaFast);
  const emaSlow = ema(close, parameters.emaSlow);
  const macdSeries = macd(close, parameters.macdFast, parameters.macdSlow, parameters.macdSignal);
  const volumeAverage = sma(volumes, 20);
  const highBreakout = rollingHigh(close, 20);
  const lowBreakdown = rollingLow(close, 20);
  const vwapSeries = vwap(candles, 20);
  const bollingerSeries = bollinger(close, 20);
  const momentumSeries = momentum(close, 10);

  let cash = intent.capitalUsd;
  let quantity = 0;
  let entryPrice = 0;
  let entryIndex = 0;
  let periodsInMarket = 0;
  const allocation = riskAllocation[intent.riskProfile];
  const assumptions = getExecutionAssumptions();
  const feeRate = assumptions.feeBps / 10_000;
  const slippageRate = assumptions.slippageBps / 10_000;
  const trades: Trade[] = [];
  const equityCurve: EquityPoint[] = [];

  for (let index = 1; index < candles.length; index += 1) {
    const candle = candles[index];
    if (quantity > 0) {
      periodsInMarket += 1;
      const exitReason = getExitReason(index, candle.close, entryPrice, parameters, rsiSeries, macdSeries.histogram);
      const maxHoldReached = index - entryIndex >= parameters.maxHoldingPeriods;

      if (exitReason || maxHoldReached) {
        const exitPrice = applyExitSlippage(candle.close, slippageRate);
        const grossExitValue = quantity * exitPrice;
        const exitValue = grossExitValue * (1 - feeRate);
        const entryCost = tradesEntryCost(quantity, entryPrice, feeRate);
        const returnPct = ((exitValue - entryCost) / entryCost) * 100;
        cash += exitValue;
        quantity = 0;
        trades.push({
          entryTime: candles[entryIndex].timestamp,
          exitTime: candle.timestamp,
          entryPrice,
          exitPrice,
          returnPct,
          reason: exitReason ?? "Max holding period reached",
          holdingPeriods: index - entryIndex
        });
      }
    }

    if (
      quantity === 0 &&
      shouldEnter(
        intent,
        strategy,
        parameters,
        index,
        close,
        volumes,
        rsiSeries,
        emaFast,
        emaSlow,
        macdSeries.histogram,
        volumeAverage,
        highBreakout,
        lowBreakdown,
        vwapSeries,
        bollingerSeries,
        momentumSeries
      )
    ) {
      const investedCash = cash * allocation;
      const entryCashAfterFee = investedCash * (1 - feeRate);
      const executionPrice = applyEntrySlippage(candle.close, slippageRate);
      quantity = entryCashAfterFee / executionPrice;
      cash -= investedCash;
      entryPrice = executionPrice;
      entryIndex = index;
    }

    equityCurve.push({
      timestamp: candle.timestamp,
      equity: cash + quantity * candle.close,
      close: candle.close
    });
  }

  if (quantity > 0) {
    const last = candles[candles.length - 1];
    const exitPrice = applyExitSlippage(last.close, slippageRate);
    const grossExitValue = quantity * exitPrice;
    const exitValue = grossExitValue * (1 - feeRate);
    const entryCost = tradesEntryCost(quantity, entryPrice, feeRate);
    cash += exitValue;
    trades.push({
      entryTime: candles[entryIndex].timestamp,
      exitTime: last.timestamp,
      entryPrice,
      exitPrice,
      returnPct: ((exitValue - entryCost) / entryCost) * 100,
      reason: "Closed at end of test window",
      holdingPeriods: candles.length - 1 - entryIndex
    });
    quantity = 0;
  }

  const metrics = calculateMetrics(intent.capitalUsd, cash, candles, equityCurve, trades, periodsInMarket);
  const risk = calculateRisk(candles, metrics, parameters, intent);
  return { metrics, risk, trades, equityCurve };
}

function shouldEnter(
  intent: StrategyIntent,
  strategy: GeneratedStrategy,
  parameters: StrategyParameters,
  index: number,
  close: number[],
  volumes: number[],
  rsiSeries: Array<number | null>,
  emaFast: Array<number | null>,
  emaSlow: Array<number | null>,
  macdHistogram: Array<number | null>,
  volumeAverage: Array<number | null>,
  highBreakout: Array<number | null>,
  lowBreakdown: Array<number | null>,
  vwapSeries: Array<number | null>,
  bollingerSeries: ReturnType<typeof bollinger>,
  momentumSeries: Array<number | null>
) {
  const rsiValue = rsiSeries[index];
  const fast = emaFast[index];
  const slow = emaSlow[index];
  const macdValue = macdHistogram[index];
  const averageVolume = volumeAverage[index];
  const currentVolume = volumes[index];
  const price = close[index];
  const indicatorConfirmed = confirmsGeneratedIndicators(intent, strategy, index, price, currentVolume, averageVolume, vwapSeries, bollingerSeries, momentumSeries);

  if ([rsiValue, fast, slow, macdValue].some((value) => value === null)) return false;

  switch (intent.strategyType) {
    case "mean_reversion":
      return Boolean(rsiValue !== null && rsiValue <= parameters.rsiEntry && fast !== null && price > fast && indicatorConfirmed);
    case "breakout":
      return Boolean(highBreakout[index] !== null && price > highBreakout[index]! && rsiValue !== null && rsiValue >= parameters.rsiEntry && macdValue !== null && macdValue > 0 && indicatorConfirmed);
    case "trend":
      return Boolean(fast !== null && slow !== null && fast > slow && price > fast && rsiValue !== null && rsiValue >= parameters.rsiEntry && macdValue !== null && macdValue > 0 && indicatorConfirmed);
    case "swing":
      return Boolean(
        lowBreakdown[index] !== null &&
          rsiValue !== null &&
          rsiValue <= Math.max(parameters.rsiEntry, 45) &&
          fast !== null &&
          slow !== null &&
          fast > slow &&
          price > lowBreakdown[index]! &&
          indicatorConfirmed
      );
    case "momentum":
    default:
      return Boolean(
        fast !== null &&
          slow !== null &&
          fast > slow &&
          price > fast &&
          rsiValue !== null &&
          rsiValue >= parameters.rsiEntry &&
          macdValue !== null &&
          macdValue > 0 &&
          indicatorConfirmed
      );
  }
}

function confirmsGeneratedIndicators(
  intent: StrategyIntent,
  strategy: GeneratedStrategy,
  index: number,
  price: number,
  currentVolume: number,
  averageVolume: number | null,
  vwapSeries: Array<number | null>,
  bollingerSeries: ReturnType<typeof bollinger>,
  momentumSeries: Array<number | null>
) {
  const indicators = new Set(strategy.indicators);
  if (indicators.has("Volume") && ["momentum", "trend", "breakout"].includes(intent.strategyType) && averageVolume !== null && currentVolume < averageVolume) {
    return false;
  }

  const vwapValue = vwapSeries[index];
  if (indicators.has("VWAP") && vwapValue !== null && ["momentum", "trend", "breakout"].includes(intent.strategyType) && price < vwapValue) {
    return false;
  }

  if (indicators.has("Bollinger")) {
    const upper = bollingerSeries.upper[index];
    const middle = bollingerSeries.middle[index];
    if (intent.strategyType === "breakout" && upper !== null && price < upper * 0.995) return false;
    if (intent.strategyType === "mean_reversion" && middle !== null && price > middle * 1.015) return false;
  }

  const momentumValue = momentumSeries[index];
  if (indicators.has("Momentum") && momentumValue !== null) {
    const minMomentum = ["mean_reversion", "swing"].includes(intent.strategyType) ? -0.04 : 0;
    if (momentumValue < minMomentum) return false;
  }

  return true;
}

function getExitReason(
  index: number,
  price: number,
  entryPrice: number,
  parameters: StrategyParameters,
  rsiSeries: Array<number | null>,
  macdHistogram: Array<number | null>
) {
  const returnPct = ((price - entryPrice) / entryPrice) * 100;
  if (returnPct <= -parameters.stopLossPct) return "Stop loss";
  if (returnPct >= parameters.takeProfitPct) return "Take profit";
  if ((rsiSeries[index] ?? 0) >= parameters.rsiExit) return "RSI exit";
  if ((macdHistogram[index] ?? 0) < 0 && returnPct > 0) return "Momentum fade";
  return null;
}

function calculateMetrics(
  startingCapital: number,
  endingCapital: number,
  candles: Candle[],
  equityCurve: EquityPoint[],
  trades: Trade[],
  periodsInMarket: number
): BacktestMetrics {
  const returns = equityCurve
    .slice(1)
    .map((point, index) => (equityCurve[index].equity > 0 ? point.equity / equityCurve[index].equity - 1 : 0));
  const avgReturn = mean(returns);
  const stdev = standardDeviation(returns);
  const downside = returns.filter((value) => value < 0);
  const downsideDeviation = standardDeviation(downside);
  const sharpe = stdev === 0 ? 0 : (avgReturn / stdev) * Math.sqrt(periodsPerYear);
  const sortino = downsideDeviation === 0 ? 0 : (avgReturn / downsideDeviation) * Math.sqrt(periodsPerYear);
  const wins = trades.filter((trade) => trade.returnPct > 0);
  const losses = trades.filter((trade) => trade.returnPct <= 0);
  const grossProfit = wins.reduce((sum, trade) => sum + trade.returnPct, 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.returnPct, 0));
  const totalReturnPct = (endingCapital / startingCapital - 1) * 100;
  const days = Math.max(1, (Date.parse(candles[candles.length - 1].timestamp) - Date.parse(candles[0].timestamp)) / 86_400_000);
  const cagrPct = ((endingCapital / startingCapital) ** (periodsPerYear / days) - 1) * 100;

  return {
    startingCapital,
    endingCapital,
    totalReturnPct,
    cagrPct,
    winRatePct: trades.length === 0 ? 0 : (wins.length / trades.length) * 100,
    sharpe,
    sortino,
    maxDrawdownPct: calculateMaxDrawdown(equityCurve.map((point) => point.equity)),
    profitFactor: grossLoss === 0 ? grossProfit || 0 : grossProfit / grossLoss,
    trades: trades.length,
    exposurePct: (periodsInMarket / candles.length) * 100
  };
}

function calculateMaxDrawdown(equity: number[]) {
  let peak = equity[0] ?? 0;
  let maxDrawdown = 0;
  for (const value of equity) {
    peak = Math.max(peak, value);
    if (peak > 0) {
      maxDrawdown = Math.max(maxDrawdown, ((peak - value) / peak) * 100);
    }
  }
  return maxDrawdown;
}

function calculateRisk(candles: Candle[], metrics: BacktestMetrics, parameters: StrategyParameters, intent: StrategyIntent): RiskAnalysis {
  const returns = logReturns(candles.map((candle) => candle.close));
  const volatilityAnnualizedPct = standardDeviation(returns) * Math.sqrt(periodsPerYear) * 100;
  const profileLoad = intent.riskProfile === "conservative" ? 12 : intent.riskProfile === "balanced" ? 24 : 38;
  const riskScore = Math.max(
    0,
    Math.min(100, profileLoad + volatilityAnnualizedPct * 0.45 + metrics.maxDrawdownPct * 0.75 - Math.max(metrics.sharpe, 0) * 5)
  );
  const suggestedAllocationPct = Math.max(3, Math.min(35, 28 - riskScore * 0.18));
  const suggestedMaxLeverage = Math.max(1, Math.min(3, 4 - riskScore / 28));
  const notes = [
    metrics.trades < 5
      ? "Low trade count: treat this as a research lead until a wider window is tested."
      : "Trade count is large enough for a first-pass comparison, but not a live-trading guarantee.",
    volatilityAnnualizedPct > 90
      ? "Annualized volatility is elevated; reduce allocation or widen the test window before deployment."
      : "Volatility is inside a range where fixed stop logic can be evaluated.",
    metrics.maxDrawdownPct > 20
      ? "Drawdown is material; require a smaller position size or a stronger market-regime filter."
      : "Drawdown stayed controlled inside this historical window."
  ];

  return {
    riskScore,
    volatilityAnnualizedPct,
    suggestedAllocationPct,
    suggestedMaxLeverage,
    stopLossPct: parameters.stopLossPct,
    notes
  };
}

function applyEntrySlippage(price: number, slippageRate: number) {
  return price * (1 + slippageRate);
}

function applyExitSlippage(price: number, slippageRate: number) {
  return price * (1 - slippageRate);
}

function tradesEntryCost(quantity: number, entryPrice: number, feeRate: number) {
  const entryValueAfterFee = quantity * entryPrice;
  return entryValueAfterFee / (1 - feeRate);
}
