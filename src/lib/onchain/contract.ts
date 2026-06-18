import { encodeFunctionData, getAddress, isAddress, parseAbi } from "viem";
import { getServerEnv } from "@/lib/env";
import { verifyStrategyReportProof } from "@/lib/strategy/proof";
import type { StrategyReport } from "@/lib/strategy/types";

export const strategyRegistryAbi = parseAbi([
  "function VERSION() view returns (string)",
  "function isRecorded(bytes32 strategyHash) view returns (bool)",
  "function recordStrategy(bytes32 strategyHash,string symbol,string metadataURI,uint256 riskScore)",
  "event StrategyRecorded(address indexed researcher, bytes32 indexed strategyHash, string symbol, string metadataURI, uint256 riskScore, uint256 createdAt)"
]);

export function prepareAttestation(report: StrategyReport) {
  const proof = verifyStrategyReportProof(report);
  const env = getServerEnv();
  const address = env.strategyRegistryAddress;
  if (!address || !isAddress(address)) {
    return {
      configured: false,
      chainId: env.defaultChainId,
      message: "NEXT_PUBLIC_STRATEGY_REGISTRY_ADDRESS is not configured with a deployed registry contract."
    } as const;
  }

  const metadataURI = buildAttestationMetadataURI(report);
  const data = encodeFunctionData({
    abi: strategyRegistryAbi,
    functionName: "recordStrategy",
    args: [proof.strategyHash as `0x${string}`, report.market.symbol, metadataURI, BigInt(Math.round(report.risk.riskScore))]
  });

  return {
    configured: true,
    chainId: env.defaultChainId,
    to: getAddress(address),
    data,
    value: "0x0",
    strategyHash: proof.strategyHash,
    metadataURI
  } as const;
}

export function buildAttestationMetadataURI(report: StrategyReport) {
  const metadata = {
    name: `${report.market.symbol} StrategyGPT AI report`,
    description: "StrategyGPT AI generated strategy research attestation metadata.",
    external_url: envSafeAppUrl(),
    strategy_hash: report.onchain.strategyHash,
    generated_at: report.createdAt,
    symbol: report.market.symbol,
    risk_score: Math.round(report.risk.riskScore),
    total_return_pct: Number(report.metrics.totalReturnPct.toFixed(4)),
    max_drawdown_pct: Number(report.metrics.maxDrawdownPct.toFixed(4)),
    plan_source: report.engine.planSource,
    data_provider: report.engine.dataProvider,
    candle_interval: report.engine.candleInterval,
    execution_fee_bps: report.engine.executionFeeBps,
    execution_slippage_bps: report.engine.executionSlippageBps,
    hash_version: report.engine.hashVersion
  };
  return `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString("base64")}`;
}

function envSafeAppUrl() {
  return getServerEnv().appUrl.replace(/\/$/, "");
}
