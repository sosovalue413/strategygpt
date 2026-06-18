"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Trash2 } from "lucide-react";
import { clearStoredReports, readStoredReportsEverywhere } from "@/lib/storage/reports";
import type { StrategyReport } from "@/lib/strategy/types";
import { formatCurrency, formatPercent } from "@/lib/utils/format";

export function HistoryClient() {
  const [reports, setReports] = useState<StrategyReport[]>([]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void readStoredReportsEverywhere().then(setReports);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  function clearHistory() {
    void clearStoredReports();
    setReports([]);
  }

  if (reports.length === 0) {
    return (
      <section className="surface empty-state">
        <h2>No saved strategy runs yet.</h2>
        <p className="muted-text">Generate a strategy first. Reports are saved in this browser so you can publish hashes later.</p>
        <Link className="button button--primary" href="/">
          Open generator
        </Link>
      </section>
    );
  }

  return (
    <section className="history-list">
      <div className="history-actions">
        <p className="muted-text">{reports.length} saved reports across this browser and the server store</p>
        <button className="button button--secondary" type="button" onClick={clearHistory}>
          <Trash2 size={16} aria-hidden="true" />
          Clear
        </button>
      </div>
      {reports.map((report) => (
        <article className="surface history-item" key={report.id}>
          <div>
            <p className="eyeline">{new Date(report.createdAt).toLocaleString()}</p>
            <h2>{report.strategy.name}</h2>
            <p className="muted-text">{report.prompt}</p>
          </div>
          <dl className="history-metrics">
            <div>
              <dt>Asset</dt>
              <dd>{report.market.symbol}</dd>
            </div>
            <div>
              <dt>Return</dt>
              <dd>{formatPercent(report.metrics.totalReturnPct)}</dd>
            </div>
            <div>
              <dt>Ending equity</dt>
              <dd>{formatCurrency(report.metrics.endingCapital, 0)}</dd>
            </div>
            <div>
              <dt>Risk</dt>
              <dd>{Math.round(report.risk.riskScore)}</dd>
            </div>
          </dl>
          <button className="button button--secondary" type="button" onClick={() => navigator.clipboard.writeText(report.onchain.strategyHash)}>
            <Copy size={16} aria-hidden="true" />
            Copy hash
          </button>
        </article>
      ))}
    </section>
  );
}
