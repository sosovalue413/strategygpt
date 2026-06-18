import type { Metadata } from "next";
import { HistoryClient } from "@/components/strategy/history-client";

export const metadata: Metadata = {
  title: "History",
  description: "Review saved StrategyGPT AI reports, compare backtest results, and copy strategy hashes for attestation.",
  alternates: {
    canonical: "/history"
  },
  openGraph: {
    title: "History | StrategyGPT AI",
    description: "Saved strategy research reports and canonical hashes.",
    url: "/history"
  }
};

export default function HistoryPage() {
  return (
    <section className="page section page-top">
      <div className="section-head">
        <p className="eyeline">Research ledger</p>
        <h1>Saved strategy runs.</h1>
        <p className="hero-copy">Compare generated reports, copy hashes, and keep the last few browser-local runs ready for attestation.</p>
      </div>
      <HistoryClient />
    </section>
  );
}
