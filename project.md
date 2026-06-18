# StrategyGPT AI Project Spec

StrategyGPT AI is a natural-language crypto strategy research app. It converts a user prompt into a typed strategy intent, generates strategy rules, pulls CoinMarketCap market data, runs a deterministic backtest, scores risk, and prepares an on-chain attestation for the final report hash.

## Current Production Shape

- Frontend and API: Next.js App Router
- Prompt parser: OpenAI Responses API with deterministic fallback
- Market data: CoinMarketCap quotes, listings, daily OHLCV, Fear & Greed, and trending assets when available
- Backtest engine: TypeScript indicator engine with RSI, EMA, MACD, ATR, VWAP, Bollinger Bands, Momentum, volume checks, fees, and slippage
- Persistence: PostgreSQL through `DATABASE_URL`, with local `.data` file fallback for development
- Rate limiting: Upstash Redis REST when configured, with in-memory fallback for development
- Monitoring: Prometheus-format metrics at `/api/metrics`
- On-chain: EIP-1193 wallet transaction to `StrategyRegistry`
- Packaging: Dockerfile, Docker Compose, and Kubernetes manifest

## Production Blockers

- Deploy `contracts/StrategyRegistry.sol` and set `NEXT_PUBLIC_STRATEGY_REGISTRY_ADDRESS`.
- Rotate any API keys that were pasted into chat, logs, or shared documents.
- Use real production infrastructure values for `DATABASE_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and `STRATEGYGPT_API_TOKEN`.

## Non-Goals

- The app does not place trades.
- The app does not custody funds or private keys.
- Backtests are research artifacts, not financial advice or return guarantees.
