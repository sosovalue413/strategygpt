"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, Loader2, RotateCcw } from "lucide-react";
import { appApiHeaders } from "@/lib/client/api";
import { persistStoredReport } from "@/lib/storage/reports";
import type { RiskProfile, StrategyReport, Timeframe } from "@/lib/strategy/types";
import { StrategyReportView } from "./strategy-report-view";

const presets = [
  "Build a conservative ETH swing strategy for high volatility.",
  "Generate a BTC momentum strategy for a bear market recovery.",
  "Create an aggressive SOL breakout strategy with strict stop loss."
];

export function StrategyWorkbench() {
  const [prompt, setPrompt] = useState("");
  const [riskProfile, setRiskProfile] = useState<RiskProfile>("balanced");
  const [timeframe, setTimeframe] = useState<Timeframe>("daily");
  const [capitalUsd, setCapitalUsd] = useState(10_000);
  const [lookbackDays, setLookbackDays] = useState(180);
  const [report, setReport] = useState<StrategyReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => prompt.trim().length >= 8 && !loading, [prompt, loading]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/strategy/generate", {
        method: "POST",
        headers: appApiHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          prompt,
          riskProfile,
          timeframe,
          capitalUsd,
          lookbackDays
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Strategy generation failed.");
      }
      setReport(payload.report);
      void persistStoredReport(payload.report);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Strategy generation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="workbench">
      <form className="surface prompt-panel" onSubmit={onSubmit} aria-busy={loading}>
        <div className="prompt-panel__head">
          <div>
            <p className="eyeline">Natural language in</p>
            <h2>Describe the market idea.</h2>
          </div>
          <button className="button button--ghost" type="button" onClick={() => setPrompt("")} disabled={loading}>
            <RotateCcw size={16} aria-hidden="true" />
            Reset
          </button>
        </div>

        <label className="label" htmlFor="strategy-prompt">
          Strategy prompt
          <textarea
            id="strategy-prompt"
            className="textarea"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Example: Generate a conservative BTC strategy for bear markets."
            aria-describedby={error ? "strategy-error" : "strategy-help"}
            aria-invalid={Boolean(error)}
          />
        </label>
        <p id="strategy-help" className="muted-text">
          The model proposes rules; CoinMarketCap data and the local engine handle calculations.
        </p>

        <div className="preset-row" aria-label="Prompt presets">
          {presets.map((preset) => (
            <button className="preset" type="button" key={preset} onClick={() => setPrompt(preset)}>
              {preset}
            </button>
          ))}
        </div>

        <div className="control-grid">
          <label className="label" htmlFor="risk-profile">
            Risk profile
            <select id="risk-profile" className="select" value={riskProfile} onChange={(event) => setRiskProfile(event.target.value as RiskProfile)}>
              <option value="conservative">Conservative</option>
              <option value="balanced">Balanced</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </label>
          <label className="label" htmlFor="timeframe">
            Timeframe
            <select id="timeframe" className="select" value={timeframe} onChange={(event) => setTimeframe(event.target.value as Timeframe)}>
              <option value="daily">Daily OHLCV</option>
            </select>
          </label>
          <label className="label" htmlFor="capital">
            Capital
            <input
              id="capital"
              className="field"
              type="number"
              min={100}
              max={10000000}
              step={100}
              value={capitalUsd}
              onChange={(event) => setCapitalUsd(Number(event.target.value))}
            />
          </label>
          <label className="label" htmlFor="lookback">
            Lookback days
            <input
              id="lookback"
              className="field"
              type="number"
              min={35}
              max={365}
              step={15}
              value={lookbackDays}
              onChange={(event) => setLookbackDays(Number(event.target.value))}
            />
          </label>
        </div>

        {error ? (
          <p id="strategy-error" className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <button className="button button--primary" type="submit" disabled={!canSubmit} aria-describedby={!canSubmit ? "submit-disabled-reason" : undefined}>
          {loading ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
          Generate and backtest
        </button>
        {!canSubmit ? (
          <span id="submit-disabled-reason" className="sr-only">
            Enter at least eight characters before generating a strategy.
          </span>
        ) : null}
      </form>

      <aside className="surface proof-panel" aria-label="Pipeline">
        <p className="eyeline">Pipeline</p>
        <ol className="pipeline-list">
          <li>
            <strong>Intent</strong>
            <span>OpenAI structured output or deterministic fallback.</span>
          </li>
          <li>
            <strong>Market data</strong>
            <span>CMC ID mapping, latest quote, daily OHLCV candles, sentiment.</span>
          </li>
          <li>
            <strong>Backtest</strong>
            <span>RSI, EMA, MACD, ATR, VWAP, Bollinger, momentum, risk sizing, trade ledger.</span>
          </li>
          <li>
            <strong>On-chain</strong>
            <span>Canonical JSON hash ready for wallet attestation.</span>
          </li>
        </ol>
      </aside>

      {report ? <StrategyReportView report={report} /> : null}
    </div>
  );
}
