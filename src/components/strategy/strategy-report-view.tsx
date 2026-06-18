"use client";

import { CheckCircle2, Copy, ShieldAlert, TrendingUp } from "lucide-react";
import type { StrategyReport } from "@/lib/strategy/types";
import { EquityChart } from "@/components/charts/equity-chart";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils/format";
import { MetricRow } from "./metric-row";

export function StrategyReportView({ report }: { report: StrategyReport }) {
  return (
    <article className="report-view fade-in">
      <header className="report-heading">
        <div>
          <p className="eyeline">{report.market.symbol} · {report.intent.timeframe}</p>
          <h2>{report.strategy.name}</h2>
        </div>
        <button
          className="button button--secondary"
          type="button"
          onClick={() => navigator.clipboard.writeText(report.onchain.strategyHash)}
        >
          <Copy size={16} aria-hidden="true" />
          Copy hash
        </button>
      </header>

      <MetricRow metrics={report.metrics} risk={report.risk} />

      <section className="surface report-panel">
        <h3>Data Provenance</h3>
        <dl className="spec-list">
          <div>
            <dt>Plan source</dt>
            <dd>{report.engine.planSource === "openai" ? "OpenAI structured output" : "Deterministic fallback"}</dd>
          </div>
          <div>
            <dt>Market provider</dt>
            <dd>{report.engine.dataProvider}</dd>
          </div>
          <div>
            <dt>Backtest cadence</dt>
            <dd>{report.engine.candleInterval}</dd>
          </div>
          <div>
            <dt>Execution model</dt>
            <dd>{report.engine.executionFeeBps} bps fee · {report.engine.executionSlippageBps} bps slippage</dd>
          </div>
          <div>
            <dt>Hash version</dt>
            <dd>{report.engine.hashVersion}</dd>
          </div>
        </dl>
        {report.engine.planWarning ? <p className="form-note">{report.engine.planWarning}</p> : null}
      </section>

      <section className="report-grid" aria-label="Strategy details">
        <div className="surface report-panel">
          <h3>
            <TrendingUp size={18} aria-hidden="true" />
            Rules
          </h3>
          <RuleList title="Entry" items={report.strategy.entryRules} />
          <RuleList title="Exit" items={report.strategy.exitRules} />
          <RuleList title="Invalidation" items={report.strategy.invalidationRules} />
        </div>

        <div className="surface report-panel">
          <h3>
            <ShieldAlert size={18} aria-hidden="true" />
            Risk
          </h3>
          <dl className="spec-list">
            <div>
              <dt>Suggested allocation</dt>
              <dd>{formatPercent(report.risk.suggestedAllocationPct)}</dd>
            </div>
            <div>
              <dt>Research leverage cap</dt>
              <dd>{formatNumber(report.risk.suggestedMaxLeverage)}x</dd>
            </div>
            <div>
              <dt>Volatility</dt>
              <dd>{formatPercent(report.risk.volatilityAnnualizedPct)}</dd>
            </div>
          </dl>
          <ul className="plain-list">
            {report.risk.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="surface report-panel">
        <h3>Equity Curve</h3>
        <EquityChart data={report.equityCurve} />
      </section>

      <section className="report-grid">
        <div className="surface report-panel">
          <h3>
            <CheckCircle2 size={18} aria-hidden="true" />
            Explainability
          </h3>
          <p className="report-summary">{report.explanation.summary}</p>
          <RuleList title="Why it should work" items={report.explanation.whyItShouldWork} />
          <RuleList title="Failure modes" items={report.explanation.failureModes} />
        </div>

        <div className="surface report-panel">
          <h3>Optimization</h3>
          <div className="variant-list">
            {report.optimizedVariants.map((variant) => (
              <div className="variant" key={`${variant.label}-${variant.score}`}>
                <div>
                  <strong>{variant.label}</strong>
                  <span>Score {formatNumber(variant.score)}</span>
                </div>
                <div>
                  <span>Return {formatPercent(variant.metrics.totalReturnPct)}</span>
                  <span>DD {formatPercent(variant.metrics.maxDrawdownPct)}</span>
                  <span>TP {formatPercent(variant.parameters.takeProfitPct)}</span>
                  <span>SL {formatPercent(variant.parameters.stopLossPct)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="surface report-panel">
        <h3>Trades</h3>
        {report.trades.length === 0 ? (
          <p className="muted-text">No completed trades in this tested window. Expand the lookback or loosen entry criteria.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>Entry price</th>
                  <th>Exit price</th>
                  <th>Return</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {report.trades.slice(-10).map((trade) => (
                  <tr key={`${trade.entryTime}-${trade.exitTime}`}>
                    <td>{new Date(trade.entryTime).toLocaleDateString()}</td>
                    <td>{new Date(trade.exitTime).toLocaleDateString()}</td>
                    <td>{formatCurrency(trade.entryPrice)}</td>
                    <td>{formatCurrency(trade.exitPrice)}</td>
                    <td>{formatPercent(trade.returnPct)}</td>
                    <td>{trade.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </article>
  );
}

function RuleList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rule-list">
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
