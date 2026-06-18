import type { Metadata } from "next";
import { MarketOverview } from "@/components/market/market-overview";

export const metadata: Metadata = {
  title: "Markets",
  description: "Inspect live CoinMarketCap quotes, market listings, Fear & Greed, and trending assets before generating a strategy report.",
  alternates: {
    canonical: "/markets"
  },
  openGraph: {
    title: "Markets | StrategyGPT AI",
    description: "Live CoinMarketCap market context for StrategyGPT AI research runs.",
    url: "/markets"
  }
};

export default function MarketsPage() {
  return (
    <section className="page section page-top">
      <div className="section-head">
        <p className="eyeline">CoinMarketCap live layer</p>
        <h1>Market data before model output.</h1>
        <p className="hero-copy">Inspect the asset and broader market state before you ask the strategy engine to backtest a thesis.</p>
      </div>
      <MarketOverview />
    </section>
  );
}
