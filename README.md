# StrategyGPT AI

StrategyGPT AI is a natural-language crypto strategy research workbench. A user describes a trading idea in plain English, and the app converts it into typed strategy intent, generated rules, CoinMarketCap-backed market data, deterministic backtests, risk analysis, optimized variants, and an on-chain attestation payload for the final report hash.

It is research software. It does not place trades, custody funds, request private keys in the browser, or promise returns.

## What It Does

- Parses prompts such as `Build a balanced ETH momentum strategy for volatile markets.`
- Uses OpenAI structured output with a deterministic local fallback.
- Resolves crypto assets through CoinMarketCap IDs.
- Pulls latest quotes, top listings, daily OHLCV candles, Fear & Greed, and trending assets when available.
- Computes RSI, EMA, MACD, ATR, VWAP, Bollinger Bands, Momentum, rolling highs/lows, volume filters, fees, and slippage in application code.
- Runs a deterministic long-only spot backtest and automatically selects an executable optimized variant if the first generated parameters produce no completed trades.
- Persists reports to PostgreSQL when `DATABASE_URL` is configured, with local `.data` file fallback for development.
- Exposes Prometheus-format metrics at `/api/metrics`.
- Supports optional API gating with `STRATEGYGPT_API_TOKEN`.
- Prepares EIP-1193 wallet calldata for the `StrategyRegistry` contract.

## Architecture

```text
Next.js App Router UI
  |
  +-- /api/strategy/generate
  |     +-- OpenAI structured parser
  |     +-- CoinMarketCap daily OHLCV/quote data
  |     +-- TypeScript indicator + backtest engine
  |     +-- Risk + optimizer engine
  |     +-- Full-report canonical hash
  |
  +-- /api/reports
  |     +-- PostgreSQL store when DATABASE_URL is set
  |     +-- .data file store fallback for local development
  |
  +-- /api/onchain/prepare
  |     +-- Server-side report hash verification
  |     +-- StrategyRegistry calldata
  |
  +-- /api/metrics
        +-- Prometheus-format API counters
```

Production packaging is included through `Dockerfile`, `docker-compose.yml`, and `k8s/strategygpt.yaml`.
The app uses Next.js standalone output. `npm run start` copies required static assets into the standalone folder, then starts the generated server.

## Main Pages

- `/` — generator, backtest workbench, production status strip.
- `/markets` — live CoinMarketCap quote, listings, Fear & Greed, and trending assets.
- `/history` — saved reports from browser and server store.
- `/onchain` — prepares and sends registry attestation transactions.
- `/methodology` — explains parser, market data, indicators, risk, storage, and on-chain proof.

## Environment

Create `.env` from `.env.example`.

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5
COINMARKETCAP_API_KEY=
COINMARKETCAP_BASE_URL=https://pro-api.coinmarketcap.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_CHAIN_ID=11155111
NEXT_PUBLIC_STRATEGY_REGISTRY_ADDRESS=
NEXT_PUBLIC_BLOCK_EXPLORER_TX_URL=https://sepolia.etherscan.io/tx
STRATEGYGPT_API_TOKEN=
NEXT_PUBLIC_STRATEGYGPT_API_TOKEN=
DATABASE_URL=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
EXECUTION_FEE_BPS=10
EXECUTION_SLIPPAGE_BPS=5
RPC_URL=
DEPLOYER_PRIVATE_KEY=
```

Required for normal app use:

- `OPENAI_API_KEY`
- `COINMARKETCAP_API_KEY`

Required for production-grade persistence and rate limiting:

- `DATABASE_URL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Required for private deployments:

- `STRATEGYGPT_API_TOKEN`
- `NEXT_PUBLIC_STRATEGYGPT_API_TOKEN`

Required for on-chain publishing:

- `NEXT_PUBLIC_DEFAULT_CHAIN_ID`
- `NEXT_PUBLIC_STRATEGY_REGISTRY_ADDRESS`

Required only when deploying the registry:

- `RPC_URL`
- `DEPLOYER_PRIVATE_KEY`

Rotate any API keys that were pasted into chat, logs, screenshots, or shared documents before using the app in production.

## Run Locally

```bash
npm install
npm run dev
```

If port `3000` is occupied:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3002
```

Then set:

```bash
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3002
```

Without `DATABASE_URL`, local development stores reports in `.data/strategy-reports.json` plus browser localStorage. On Vercel, the file fallback uses `/tmp` and is volatile; set `DATABASE_URL` for durable production report history.

To run the production build locally:

```bash
npm run build
npm run start
```

PowerShell with a custom port:

```powershell
$env:PORT = "3002"
npm run start
```

## Docker

```bash
docker compose up --build
```

The compose file starts the app and PostgreSQL. Redis rate limiting is designed for Upstash Redis REST in production, configured through the `UPSTASH_REDIS_REST_*` variables.

## Kubernetes

Use `k8s/secret.example.yaml` as a template for real secrets, then deploy:

```bash
kubectl apply -f k8s/secret.example.yaml
kubectl apply -f k8s/strategygpt.yaml
```

Replace the image in `k8s/strategygpt.yaml` with your pushed container image for a real cluster.

## Deploy The Registry Contract

```bash
RPC_URL=https://your-rpc.example \
DEPLOYER_PRIVATE_KEY=0x... \
npm run deploy:registry
```

PowerShell:

```powershell
$env:RPC_URL = "https://your-rpc.example"
$env:DEPLOYER_PRIVATE_KEY = "0x..."
npm run deploy:registry
```

The script compiles and deploys `contracts/StrategyRegistry.sol`, prints the address, and writes a deployment artifact to `deployments/strategy-registry-<chainId>.json`.

Copy the printed address into:

```bash
NEXT_PUBLIC_STRATEGY_REGISTRY_ADDRESS=0x...
```

Restart the app after changing that value.

## On-chain Flow

1. Generate a report.
2. The full report payload is canonicalized and hashed.
3. `/api/onchain/prepare` recomputes the hash server-side and rejects tampered reports.
4. The app prepares calldata for `StrategyRegistry.recordStrategy`.
5. The wallet switches to the configured chain, signs, sends, and waits for a receipt.
6. The transaction records the researcher, strategy hash, symbol, metadata URI, risk score, and block timestamp.

The registry includes version metadata, duplicate-hash protection, risk-score validation, and symbol/metadata length guards.

## Data Integrity

StrategyGPT AI does not use dummy candle data or synthetic OHLC candles. If CoinMarketCap does not return enough daily OHLCV candles, the API returns an error instead of inventing history.

Every report includes provenance:

- parser source
- parser warning when fallback or parameter rescue is used
- data provider and quote source
- candle cadence
- execution fee/slippage assumptions
- hash version
- canonical report JSON

## Monitoring

Runtime health:

```bash
curl http://localhost:3000/api/health
```

Prometheus metrics:

```bash
curl http://localhost:3000/api/metrics
```

The UI also shows a production status strip for OpenAI, CoinMarketCap, registry, report store, Redis rate limit, API gate, and metrics.

## Verification

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm audit --omit=dev
```

Current tests cover:

- deterministic backtest output
- advanced indicator calculations
- executable-variant behavior
- on-chain metadata URI generation
- configured registry calldata preparation
- tampered report rejection
- unconfigured registry setup messaging

## Production Checklist

- Deploy `StrategyRegistry` and set `NEXT_PUBLIC_STRATEGY_REGISTRY_ADDRESS`.
- Rotate exposed API keys.
- Set `DATABASE_URL` for durable report storage.
- Set Upstash Redis REST variables for durable rate limits across instances.
- Set `STRATEGYGPT_API_TOKEN` for private deployments.
- Point `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_BLOCK_EXPLORER_TX_URL` at production URLs.
- Run the verification commands before shipping.
