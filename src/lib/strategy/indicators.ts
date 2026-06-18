import type { Candle } from "./types";

export function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function standardDeviation(values: number[]) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = mean(values.map((value) => (value - avg) ** 2));
  return Math.sqrt(variance);
}

export function ema(values: number[], period: number): Array<number | null> {
  if (values.length === 0) return [];
  const multiplier = 2 / (period + 1);
  const output: Array<number | null> = Array(values.length).fill(null);
  let previous = values[0];

  for (let index = 0; index < values.length; index += 1) {
    if (index === 0) {
      previous = values[index];
    } else {
      previous = values[index] * multiplier + previous * (1 - multiplier);
    }
    if (index >= period - 1) {
      output[index] = previous;
    }
  }

  return output;
}

export function sma(values: number[], period: number): Array<number | null> {
  return values.map((_, index) => {
    if (index < period - 1) return null;
    return mean(values.slice(index - period + 1, index + 1));
  });
}

export function rsi(values: number[], period: number): Array<number | null> {
  const output: Array<number | null> = Array(values.length).fill(null);
  let gains = 0;
  let losses = 0;

  for (let index = 1; index < values.length; index += 1) {
    const change = values[index] - values[index - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);

    if (index <= period) {
      gains += gain;
      losses += loss;
      if (index === period) {
        const rs = losses === 0 ? 100 : gains / losses;
        output[index] = 100 - 100 / (1 + rs);
      }
      continue;
    }

    gains = (gains * (period - 1) + gain) / period;
    losses = (losses * (period - 1) + loss) / period;
    const rs = losses === 0 ? 100 : gains / losses;
    output[index] = 100 - 100 / (1 + rs);
  }

  return output;
}

export function macd(values: number[], fast: number, slow: number, signal: number) {
  const fastEma = ema(values, fast);
  const slowEma = ema(values, slow);
  const line = values.map((_, index) => {
    const fastValue = fastEma[index];
    const slowValue = slowEma[index];
    return fastValue === null || slowValue === null ? null : fastValue - slowValue;
  });
  const signalLine = ema(
    line.map((value) => value ?? 0),
    signal
  ).map((value, index) => (line[index] === null ? null : value));
  const histogram = line.map((value, index) => {
    const signalValue = signalLine[index];
    return value === null || signalValue === null ? null : value - signalValue;
  });

  return { line, signal: signalLine, histogram };
}

export function atr(candles: Candle[], period: number): Array<number | null> {
  const trueRanges = candles.map((candle, index) => {
    if (index === 0) return candle.high - candle.low;
    const previousClose = candles[index - 1].close;
    return Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previousClose),
      Math.abs(candle.low - previousClose)
    );
  });
  return sma(trueRanges, period);
}

export function vwap(candles: Candle[], period: number): Array<number | null> {
  return candles.map((_, index) => {
    if (index < period - 1) return null;
    const window = candles.slice(index - period + 1, index + 1);
    const volumeSum = window.reduce((sum, candle) => sum + candle.volume, 0);
    if (volumeSum === 0) return null;
    const valueSum = window.reduce((sum, candle) => {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      return sum + typicalPrice * candle.volume;
    }, 0);
    return valueSum / volumeSum;
  });
}

export function bollinger(values: number[], period: number, deviations = 2) {
  const middle = sma(values, period);
  const upper = values.map((_, index) => {
    const mid = middle[index];
    if (mid === null) return null;
    const window = values.slice(index - period + 1, index + 1);
    return mid + standardDeviation(window) * deviations;
  });
  const lower = values.map((_, index) => {
    const mid = middle[index];
    if (mid === null) return null;
    const window = values.slice(index - period + 1, index + 1);
    return mid - standardDeviation(window) * deviations;
  });
  return { middle, upper, lower };
}

export function momentum(values: number[], period: number): Array<number | null> {
  return values.map((value, index) => {
    const previous = values[index - period];
    if (index < period || !previous) return null;
    return value / previous - 1;
  });
}

export function rollingHigh(values: number[], period: number): Array<number | null> {
  return values.map((_, index) => {
    if (index < period) return null;
    return Math.max(...values.slice(index - period, index));
  });
}

export function rollingLow(values: number[], period: number): Array<number | null> {
  return values.map((_, index) => {
    if (index < period) return null;
    return Math.min(...values.slice(index - period, index));
  });
}

export function logReturns(values: number[]) {
  const output: number[] = [];
  for (let index = 1; index < values.length; index += 1) {
    if (values[index - 1] > 0 && values[index] > 0) {
      output.push(Math.log(values[index] / values[index - 1]));
    }
  }
  return output;
}
