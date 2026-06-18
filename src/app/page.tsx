import { StrategyWorkbench } from "@/components/strategy/strategy-workbench";
import { ProductionStatus } from "@/components/system/production-status";

export default function HomePage() {
  return (
    <section className="page hero-workbench">
      <div className="hero-workbench__header">
        <div className="hero-copy-stack">
          <p className="eyeline">Strategy research workbench</p>
          <h1 className="hero-title">Chat with the market.</h1>
          <div className="hero-proof-row" aria-label="StrategyGPT capabilities">
            <span>Live CMC data</span>
            <span>Deterministic math</span>
            <span>Hash-ready reports</span>
          </div>
        </div>
        <div className="hero-brief surface">
          <p className="hero-brief__label">Research loop</p>
          <p className="hero-copy">
            Turn a plain-English crypto idea into rules, CoinMarketCap-backed candles, deterministic backtests, optimized variants, and a strategy hash ready for verification.
          </p>
        </div>
      </div>
      <ProductionStatus />
      <StrategyWorkbench />
    </section>
  );
}
