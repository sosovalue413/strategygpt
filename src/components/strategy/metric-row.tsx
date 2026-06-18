import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils/format";
import type { BacktestMetrics, RiskAnalysis } from "@/lib/strategy/types";

export function MetricRow({ metrics, risk }: { metrics: BacktestMetrics; risk: RiskAnalysis }) {
  const items = [
    { label: "Total return", value: formatPercent(metrics.totalReturnPct) },
    { label: "Win rate", value: formatPercent(metrics.winRatePct) },
    { label: "Sharpe", value: formatNumber(metrics.sharpe) },
    { label: "Max drawdown", value: formatPercent(metrics.maxDrawdownPct) },
    { label: "Profit factor", value: formatNumber(metrics.profitFactor) },
    { label: "Trades", value: formatNumber(metrics.trades, 0) },
    { label: "Ending equity", value: formatCurrency(metrics.endingCapital, 0) },
    { label: "Risk score", value: formatNumber(risk.riskScore, 0) }
  ];

  return (
    <div className="metric-strip" aria-label="Backtest metrics">
      {items.map((item) => (
        <div className="metric" key={item.label}>
          <p className="metric__value">{item.value}</p>
          <p className="metric__label">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
