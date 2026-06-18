import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Methodology",
  description: "Learn how StrategyGPT AI separates OpenAI interpretation from CoinMarketCap data, deterministic indicators, risk analysis, storage, and on-chain proof.",
  alternates: {
    canonical: "/methodology"
  },
  openGraph: {
    title: "Methodology | StrategyGPT AI",
    description: "The StrategyGPT AI system design for explainable crypto strategy research.",
    url: "/methodology"
  }
};

const layers = [
  {
    title: "Prompt parser",
    body: "OpenAI structured output turns natural language into a typed strategy plan. If it fails, a deterministic parser takes over and the report states that clearly."
  },
  {
    title: "Market data",
    body: "CoinMarketCap supplies asset IDs, latest quotes, daily historical OHLCV candles, Fear & Greed sentiment, and trending assets when available."
  },
  {
    title: "Indicator engine",
    body: "RSI, EMA, MACD, ATR, VWAP, Bollinger Bands, Momentum, rolling highs/lows, fee/slippage-adjusted equity curves, and trade ledgers are calculated in application code."
  },
  {
    title: "Risk engine",
    body: "Risk score blends volatility, drawdown, profile intent, and Sharpe quality into allocation and leverage guidance."
  },
  {
    title: "Optimization",
    body: "The app tests threshold variants for RSI, stop loss, and take profit, then ranks variants by return, drawdown, Sharpe, Sortino, and win rate."
  },
  {
    title: "On-chain proof",
    body: "The full strategy report is canonicalized and hashed server-side before a wallet transaction can attest that hash in the StrategyRegistry contract."
  },
  {
    title: "Production services",
    body: "Reports can persist to PostgreSQL, rate limits can use Redis REST, and Prometheus-format counters are exposed for monitoring."
  }
];

export default function MethodologyPage() {
  return (
    <section className="page section page-top">
      <div className="section-head">
        <p className="eyeline">System method</p>
        <h1>AI for language. Code for math.</h1>
        <p className="hero-copy">StrategyGPT keeps generation explainable by separating model interpretation from market data, indicators, and risk calculations.</p>
      </div>

      <div className="method-grid">
        {layers.map((layer) => (
          <article className="surface method-item" key={layer.title}>
            <h2>{layer.title}</h2>
            <p>{layer.body}</p>
          </article>
        ))}
      </div>

      <section className="surface report-panel">
        <h2>Research Boundary</h2>
        <p className="report-summary">
          StrategyGPT AI produces research artifacts. It does not place trades, custody keys, promise returns, or turn a backtest into live financial advice. Historical results are only useful when they survive out-of-sample testing.
        </p>
      </section>
    </section>
  );
}
