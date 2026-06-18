import { getServerEnv, requireServerEnv } from "@/lib/env";
import type { Candle, MarketSnapshot } from "@/lib/strategy/types";

const CACHE_TTL_MS = 60_000;

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

type CmcStatus = {
  error_code?: number | string;
  error_message?: string | null;
  notice?: string | null;
};

const cache = new Map<string, CacheEntry>();

export class CoinMarketCapError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly cmcCode?: number
  ) {
    super(message);
    this.name = "CoinMarketCapError";
  }
}

export type CmcAsset = {
  id: number;
  name: string;
  symbol: string;
  slug?: string;
  rank?: number;
};

export type FearGreed = {
  value: number;
  classification: string;
  updateTime?: string;
};

export type Listing = {
  id: number;
  name: string;
  symbol: string;
  price: number;
  marketCap?: number;
  volume24h?: number;
  percentChange24h?: number;
};

export type TrendingAsset = Listing & {
  rank?: number;
};

async function cmcGet<T>(path: string, params: Record<string, string | number | undefined> = {}, ttl = CACHE_TTL_MS): Promise<T> {
  const apiKey = requireServerEnv("COINMARKETCAP_API_KEY");
  const url = new URL(path, getServerEnv().coinMarketCapBaseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const cacheKey = url.toString();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-CMC_PRO_API_KEY": apiKey
      },
      signal: AbortSignal.timeout(20_000),
      next: { revalidate: Math.floor(ttl / 1000) }
    });
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError" ? "CoinMarketCap request timed out." : "CoinMarketCap request failed before a response was received.";
    throw new CoinMarketCapError(message, 504);
  }

  const body = (await response.json().catch(() => ({}))) as { status?: CmcStatus; data?: unknown };
  const cmcCode = Number(body.status?.error_code ?? 0);
  if (!response.ok) {
    throw new CoinMarketCapError(
      body.status?.error_message || `CoinMarketCap request failed with ${response.status}`,
      response.status,
      cmcCode
    );
  }

  if (cmcCode !== 0) {
    throw new CoinMarketCapError(body.status?.error_message || "CoinMarketCap returned an API error.", response.status, cmcCode);
  }

  cache.set(cacheKey, { expiresAt: Date.now() + ttl, value: body });
  return body as T;
}

export async function findAssetBySymbol(symbol: string): Promise<CmcAsset> {
  const normalized = symbol.trim().toUpperCase();
  const body = await cmcGet<{ data?: CmcAsset[] }>("/v1/cryptocurrency/map", { symbol: normalized }, 12 * CACHE_TTL_MS);
  const asset = body.data?.find((item) => item.symbol.toUpperCase() === normalized && item.id);
  if (!asset) {
    throw new CoinMarketCapError(`No active CoinMarketCap asset found for ${normalized}.`);
  }
  return asset;
}

export async function getLatestQuote(asset: CmcAsset): Promise<MarketSnapshot> {
  const body = await cmcGet<{ data?: Record<string, unknown> }>("/v2/cryptocurrency/quotes/latest", {
    id: asset.id,
    convert: "USD"
  });
  const row = Object.values(body.data ?? {})[0] as
    | {
        id: number;
        name: string;
        symbol: string;
        quote?: {
          USD?: {
            price?: number;
            market_cap?: number;
            volume_24h?: number;
            percent_change_24h?: number;
          };
        };
      }
    | undefined;
  const quote = row?.quote?.USD;
  if (!row || !quote?.price) {
    throw new CoinMarketCapError(`No latest quote returned for ${asset.symbol}.`);
  }

  return {
    cmcId: row.id,
    symbol: row.symbol,
    name: row.name,
    price: quote.price,
    marketCap: quote.market_cap,
    volume24h: quote.volume_24h,
    percentChange24h: quote.percent_change_24h,
    dataSource: "CoinMarketCap /v2/cryptocurrency/quotes/latest"
  };
}

export async function getHistoricalCandles(asset: CmcAsset, count: number): Promise<Candle[]> {
  return getOhlcvCandles(asset, count);
}

async function getOhlcvCandles(asset: CmcAsset, count: number): Promise<Candle[]> {
  const body = await cmcGet<{
    data?: {
      quotes?: Array<{
        time_close?: string;
        quote?: {
          USD?: {
            open?: number;
            high?: number;
            low?: number;
            close?: number;
            volume?: number;
            timestamp?: string;
          };
        };
      }>;
    };
  }>(
    "/v2/cryptocurrency/ohlcv/historical",
    {
      id: asset.id,
      time_period: "daily",
      count,
      convert: "USD"
    },
    10 * CACHE_TTL_MS
  );

  const quotes = body.data?.quotes ?? [];
  const candles = quotes
    .map((quote): Candle | null => {
      const usd = quote.quote?.USD;
      if (!usd?.open || !usd.high || !usd.low || !usd.close) return null;
      return {
        timestamp: quote.time_close ?? usd.timestamp ?? new Date().toISOString(),
        open: usd.open,
        high: usd.high,
        low: usd.low,
        close: usd.close,
        volume: usd.volume ?? 0
      };
    })
    .filter((candle): candle is Candle => Boolean(candle))
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

  if (candles.length < 35) {
    throw new CoinMarketCapError("CoinMarketCap OHLCV returned too few candles for backtesting.");
  }
  return candles;
}

export async function getFearGreedLatest(): Promise<FearGreed | undefined> {
  try {
    const body = await cmcGet<{
      data?: {
        value?: number;
        value_classification?: string;
        update_time?: string;
      };
    }>("/v3/fear-and-greed/latest", {}, 15 * 60_000);
    if (typeof body.data?.value !== "number") return undefined;
    return {
      value: body.data.value,
      classification: body.data.value_classification ?? "Unknown",
      updateTime: body.data.update_time
    };
  } catch {
    return undefined;
  }
}

export async function getMarketSnapshot(symbol: string) {
  const asset = await findAssetBySymbol(symbol);
  const [quote, fearGreed] = await Promise.all([getLatestQuote(asset), getFearGreedLatest()]);
  return {
    asset,
    market: {
      ...quote,
      fearGreed
    }
  };
}

export async function getTopListings(limit = 12): Promise<Listing[]> {
  const body = await cmcGet<{
    data?: Array<{
      id: number;
      name: string;
      symbol: string;
      quote?: {
        USD?: {
          price?: number;
          market_cap?: number;
          volume_24h?: number;
          percent_change_24h?: number;
        };
      };
    }>;
  }>("/v1/cryptocurrency/listings/latest", { limit, sort: "market_cap", convert: "USD" }, 2 * CACHE_TTL_MS);

  return (body.data ?? [])
    .map((item) => ({
      id: item.id,
      name: item.name,
      symbol: item.symbol,
      price: item.quote?.USD?.price ?? 0,
      marketCap: item.quote?.USD?.market_cap,
      volume24h: item.quote?.USD?.volume_24h,
      percentChange24h: item.quote?.USD?.percent_change_24h
    }))
    .filter((item) => item.price > 0);
}

export async function getTrendingAssets(limit = 8): Promise<TrendingAsset[]> {
  try {
    const body = await cmcGet<{
      data?: Array<{
        id: number;
        name: string;
        symbol: string;
        cmc_rank?: number;
        quote?: {
          USD?: {
            price?: number;
            market_cap?: number;
            volume_24h?: number;
            percent_change_24h?: number;
          };
        };
      }>;
    }>("/v1/cryptocurrency/trending/latest", { limit, convert: "USD" }, 5 * CACHE_TTL_MS);

    return (body.data ?? [])
      .map((item) => ({
        id: item.id,
        name: item.name,
        symbol: item.symbol,
        rank: item.cmc_rank,
        price: item.quote?.USD?.price ?? 0,
        marketCap: item.quote?.USD?.market_cap,
        volume24h: item.quote?.USD?.volume_24h,
        percentChange24h: item.quote?.USD?.percent_change_24h
      }))
      .filter((item) => item.price > 0);
  } catch {
    return [];
  }
}
