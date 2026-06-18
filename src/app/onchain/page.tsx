import type { Metadata } from "next";
import { OnchainPublisher } from "@/components/onchain/onchain-publisher";

export const metadata: Metadata = {
  title: "On-chain",
  description: "Prepare wallet calldata that records a StrategyGPT AI report hash in the StrategyRegistry contract.",
  alternates: {
    canonical: "/onchain"
  },
  openGraph: {
    title: "On-chain | StrategyGPT AI",
    description: "Hash strategy research reports and attest them on-chain.",
    url: "/onchain"
  }
};

export default function OnchainPage() {
  return (
    <section className="page section page-top">
      <div className="section-head">
        <p className="eyeline">Strategy attestation</p>
        <h1>Put the research hash on-chain.</h1>
        <p className="hero-copy">Publish an immutable reference to the generated rules and backtest summary without sending funds to a trading contract.</p>
      </div>
      <OnchainPublisher />
    </section>
  );
}
