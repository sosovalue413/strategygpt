import Link from "next/link";

export function AppFooter() {
  return (
    <footer className="foot-stmt">
      <p className="foot-stmt__line">Research first. Hash the result. Trade only after proof.</p>
      <div className="foot-stmt__meta">
        <span>StrategyGPT AI</span>
        <span>CoinMarketCap data · OpenAI parser · On-chain attestations</span>
        <Link href="/methodology">Methodology</Link>
      </div>
    </footer>
  );
}
