import { canonicalize, strategyHash } from "@/lib/onchain/hash";
import type { StrategyReport } from "./types";

export type StrategyReportProofInput = Omit<StrategyReport, "onchain">;

export function computeStrategyReportProof(report: StrategyReportProofInput) {
  const canonicalJson = canonicalize(report);
  return {
    strategyHash: strategyHash(report),
    canonicalJson
  };
}

export function verifyStrategyReportProof(report: StrategyReport) {
  const proofInput = Object.fromEntries(Object.entries(report).filter(([key]) => key !== "onchain")) as StrategyReportProofInput;
  const proof = computeStrategyReportProof(proofInput);
  if (proof.strategyHash.toLowerCase() !== report.onchain.strategyHash.toLowerCase() || proof.canonicalJson !== report.onchain.canonicalJson) {
    throw new Error("Strategy report hash does not match the canonical report payload. Regenerate the report before publishing.");
  }
  return proof;
}
