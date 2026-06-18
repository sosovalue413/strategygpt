"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { appApiHeaders } from "@/lib/client/api";
import { formatCompact, formatCurrency, formatPercent } from "@/lib/utils/format";

type MarketPayload = {
  selected: {
    symbol: string;
    name: string;
    price: number;
    marketCap?: number;
    volume24h?: number;
    percentChange24h?: number;
    fearGreed?: {
      value: number;
      classification: string;
      updateTime?: string;
    };
  };
  listings: Array<{
    id: number;
    symbol: string;
    name: string;
    price: number;
    marketCap?: number;
    volume24h?: number;
    percentChange24h?: number;
  }>;
  trending: Array<{
    id: number;
    symbol: string;
    name: string;
    price: number;
    marketCap?: number;
    volume24h?: number;
    percentChange24h?: number;
    rank?: number;
  }>;
  updatedAt: string;
};

export function MarketOverview() {
  const [symbol, setSymbol] = useState("BTC");
  const [data, setData] = useState<MarketPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadMarket("BTC");
  }, []);

  async function loadMarket(nextSymbol: string) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/market/snapshot?symbol=${encodeURIComponent(nextSymbol)}`, {
        headers: appApiHeaders()
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to load market data.");
      setData(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load market data.");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadMarket(symbol);
  }

  return (
    <div className="market-layout">
      <form className="surface market-search" onSubmit={onSubmit} aria-busy={loading}>
        <label className="label" htmlFor="market-symbol">
          Asset symbol
          <input id="market-symbol" className="field" value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} />
        </label>
        <button className="button button--primary" type="submit" disabled={loading || symbol.trim().length < 2}>
          {loading ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Search size={16} aria-hidden="true" />}
          Refresh
        </button>
      </form>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      {data ? (
        <>
          <section className="surface market-hero" aria-label={`${data.selected.symbol} snapshot`}>
            <div>
              <p className="eyeline">{data.selected.symbol}</p>
              <h2>{data.selected.name}</h2>
              <p className="muted-text">Updated {new Date(data.updatedAt).toLocaleString()}</p>
            </div>
            <div className="quote-price">{formatCurrency(data.selected.price)}</div>
          </section>

          <div className="metric-strip">
            <div className="metric">
              <p className="metric__value">{formatCompact(data.selected.marketCap)}</p>
              <p className="metric__label">Market cap</p>
            </div>
            <div className="metric">
              <p className="metric__value">{formatCompact(data.selected.volume24h)}</p>
              <p className="metric__label">24h volume</p>
            </div>
            <div className="metric">
              <p className="metric__value">{formatPercent(data.selected.percentChange24h ?? 0)}</p>
              <p className="metric__label">24h change</p>
            </div>
            <div className="metric">
              <p className="metric__value">{data.selected.fearGreed ? data.selected.fearGreed.value : "—"}</p>
              <p className="metric__label">{data.selected.fearGreed?.classification ?? "Fear & Greed"}</p>
            </div>
          </div>

          <section className="surface report-panel">
            <h2>Top Market Listings</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Price</th>
                    <th>Market cap</th>
                    <th>Volume</th>
                    <th>24h</th>
                  </tr>
                </thead>
                <tbody>
                  {data.listings.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.symbol}</strong>
                        <span>{item.name}</span>
                      </td>
                      <td>{formatCurrency(item.price)}</td>
                      <td>{formatCompact(item.marketCap)}</td>
                      <td>{formatCompact(item.volume24h)}</td>
                      <td>{formatPercent(item.percentChange24h ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="surface report-panel">
            <h2>CMC Trending Assets</h2>
            {data.trending.length > 0 ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Price</th>
                      <th>Market cap</th>
                      <th>Volume</th>
                      <th>24h</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.trending.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.symbol}</strong>
                          <span>{item.name}</span>
                        </td>
                        <td>{formatCurrency(item.price)}</td>
                        <td>{formatCompact(item.marketCap)}</td>
                        <td>{formatCompact(item.volume24h)}</td>
                        <td>{formatPercent(item.percentChange24h ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted-text">Trending data is unavailable for the current CoinMarketCap plan or response window.</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
