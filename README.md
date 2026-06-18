# StrategyGPT AI

StrategyGPT AI is a production-ready crypto strategy research workbench. It turns a plain-English market idea into a typed strategy plan, live CoinMarketCap-backed market context, deterministic indicator calculations, backtest results, risk notes, optimized variants, and a canonical report hash that can be attested on-chain.

Live deployment: [https://strategygpt-ai.vercel.app](https://strategygpt-ai.vercel.app)

This is research software. It does not execute trades, custody funds, request wallet private keys, or promise returns.

## Product Flow

1. A user describes a strategy idea, such as `Build a balanced BTC momentum strategy for volatile markets.`
2. OpenAI structured output converts the prompt into typed strategy intent and rules. If parsing fails, a deterministic local fallback is used and the report records that provenance.
3. CoinMarketCap resolves the asset, latest quote, top listings, daily OHLCV candles, sentiment, and trending assets when available.
4. The local TypeScript engine calculates RSI, EMA, MACD, ATR, VWAP, Bollinger Bands, Momentum, rolling highs/lows, fees, slippage, trades, and equity curves.
5. The optimizer tests real parameter variants and selects an executable variant when the initial generated rules produce no completed trades.
6. The report is canonicalized and hashed for tamper-resistant verification.
7. Optional wallet calldata can be prepared for a deployed `StrategyRegistry` contract.

## Main Screens

- `/` — strategy generator, live production status, prompt controls, pipeline overview, and generated report view.
- `/markets` — live CoinMarketCap quote, top listings, Fear & Greed when available, and CMC trending assets.
- `/history` — saved strategy reports from browser storage and the configured server store.
- `/methodology` — how StrategyGPT separates language generation, market data, indicators, risk, storage, and proofs.
- `/onchain` — advanced route for preparing StrategyRegistry attestations. It is intentionally not in the main navbar until a registry address is configured.

## Architecture

```text
Next.js App Router UI
  |
  +-- /api/strategy/generate
  |     +-- OpenAI structured parser
  |     +-- deterministic local parser fallback
  |     +-- CoinMarketCap quote + daily OHLCV data
  |     +-- indicator, backtest, risk, and optimizer engine
  |     +-- canonical report hash
  |
  +-- /api/market/snapshot
  |     +-- selected asset quote
  |     +-- top listings
  |     +-- trending assets
  |     +-- sentiment when available
  |
  +-- /api/reports
  |     +-- PostgreSQL when DATABASE_URL is set
  |     +-- local .data file fallback for development
  |     +-- /tmp volatile fallback on Vercel without DATABASE_URL
  |
  +-- /api/onchain/prepare
  |     +-- report schema validation
  |     +-- server-side proof recomputation
  |     +-- StrategyRegistry calldata
  |
  +-- /api/health and /api/metrics
        +-- runtime status and Prometheus-format counters
```

## Data Integrity

StrategyGPT AI does not use dummy candles or synthetic OHLCV history. If CoinMarketCap does not return enough daily candles for a meaningful backtest, the API returns an error instead of inventing data.

Every generated report includes:

- parser source and warning state
- data provider and quote source
- candle cadence
- fee and slippage assumptions
- generated strategy parameters
- backtest trades and equity curve
- risk analysis
- optimized variants
- hash version
- canonical report JSON

## Environment

Create `.env` from `.env.example`.

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Enables OpenAI structured strategy parsing. |
| `OPENAI_MODEL` | Model used by the Responses API. Defaults to `gpt-5.5`. |
| `COINMARKETCAP_API_KEY` | Required for live quote, listing, trending, and candle data. |
| `COINMARKETCAP_BASE_URL` | Defaults to `https://pro-api.coinmarketcap.com`. |
| `NEXT_PUBLIC_APP_URL` | Public app URL used in metadata and attestation metadata. |
| `NEXT_PUBLIC_DEFAULT_CHAIN_ID` | Wallet chain target. Defaults to `11155111`. |
| `NEXT_PUBLIC_STRATEGY_REGISTRY_ADDRESS` | Deployed registry contract address for on-chain publishing. |
| `NEXT_PUBLIC_BLOCK_EXPLORER_TX_URL` | Explorer transaction URL prefix. |
| `STRATEGYGPT_API_TOKEN` | Optional server API gate for private deployments. |
| `NEXT_PUBLIC_STRATEGYGPT_API_TOKEN` | Optional browser-side token paired with the server API gate. |
| `DATABASE_URL` | Durable PostgreSQL report storage. Strongly recommended for production. |
| `UPSTASH_REDIS_REST_URL` | Optional distributed rate-limit store. |
| `UPSTASH_REDIS_REST_TOKEN` | Optional Upstash Redis REST token. |
| `EXECUTION_FEE_BPS` | Backtest fee assumption in basis points. Defaults to `10`. |
| `EXECUTION_SLIPPAGE_BPS` | Backtest slippage assumption in basis points. Defaults to `5`. |
| `RPC_URL` | Registry deployment RPC endpoint. Not needed by the web runtime. |
| `DEPLOYER_PRIVATE_KEY` | Registry deployment key. Never expose this to the browser or Vercel runtime unless you truly need deployment automation. |

Rotate any API keys that were pasted into chat, logs, screenshots, or shared documents before using the app in production.

## Local Development

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

Local report fallback:

```text
.data/strategy-reports.json
```

Without `DATABASE_URL`, Vercel uses `/tmp/strategygpt-reports.json`, which is volatile and can disappear between serverless invocations. Use Postgres for durable report history.

## Production Build

```bash
npm run build
npm run start
```

The app uses Next.js standalone output. `npm run start` copies required static assets into `.next/standalone`, then starts the generated server.

PowerShell with a custom port:

```powershell
$env:PORT = "3002"
npm run start
```

## Docker

```bash
docker compose up --build
```

The compose file starts the app and PostgreSQL. Redis rate limiting is designed for Upstash Redis REST and is configured with the `UPSTASH_REDIS_REST_*` variables.

## Kubernetes

Use `k8s/secret.example.yaml` as the shape for real secrets:

```bash
kubectl apply -f k8s/secret.example.yaml
kubectl apply -f k8s/strategygpt.yaml
```

Replace the image in `k8s/strategygpt.yaml` with your pushed container image before using a real cluster.

## Vercel

The project is designed to deploy cleanly on Vercel. `.vercelignore` excludes local secrets, local build output, node modules, smoke logs, and local report files.

Useful commands:

```bash
npx vercel link
npx vercel env add OPENAI_API_KEY production
npx vercel env add COINMARKETCAP_API_KEY production
npx vercel --prod
```

Set `DATABASE_URL` in Vercel for durable report history. Set `NEXT_PUBLIC_STRATEGY_REGISTRY_ADDRESS` only after the registry is deployed.

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

After deployment, set:

```bash
NEXT_PUBLIC_STRATEGY_REGISTRY_ADDRESS=0x...
```

Restart or redeploy the app after changing the address.

## On-chain Proof Model

The on-chain flow records proof of research, not trading authority.

1. Generate a strategy report.
2. Canonicalize and hash the full report payload.
3. `/api/onchain/prepare` recomputes the hash server-side.
4. Tampered reports are rejected before calldata is returned.
5. The wallet signs and sends `StrategyRegistry.recordStrategy`.
6. The registry records researcher, strategy hash, symbol, metadata URI, risk score, and timestamp.

The registry includes duplicate-hash protection, risk-score validation, version metadata, and length guards for symbols and metadata URIs.

## Monitoring

Runtime health:

```bash
curl http://localhost:3000/api/health
```

Prometheus metrics:

```bash
curl http://localhost:3000/api/metrics
```

The homepage also shows a production status strip for OpenAI, CoinMarketCap, registry, report store, Redis rate limit, API gate, and metrics.

## Verification

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm audit --omit=dev
```

Current tests cover deterministic backtests, advanced indicators, executable variant rescue, on-chain metadata URI generation, configured registry calldata, tampered report rejection, and unconfigured registry messaging.
