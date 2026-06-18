import { StrategyWorkbench } from "@/components/strategy/strategy-workbench";
import { ProductionStatus } from "@/components/system/production-status";

export default function HomePage() {
  return (
    <section className="page hero-workbench">
      <div className="hero-workbench__header">
        <div>
          <p className="eyeline">Strategy research workbench</p>
          <h1 className="hero-title">Chat with the market.</h1>
        </div>
        <p className="hero-copy">
          Turn a plain-English crypto idea into rules, CoinMarketCap-backed candles, a deterministic backtest, optimized variants, and a strategy hash ready for on-chain attestation.
        </p>
      </div>
      <ProductionStatus />
      <StrategyWorkbench />
    </section>
  );
}
