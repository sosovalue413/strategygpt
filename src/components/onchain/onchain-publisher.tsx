"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, ExternalLink, Loader2, Send } from "lucide-react";
import { appApiHeaders } from "@/lib/client/api";
import { readStoredReportsEverywhere } from "@/lib/storage/reports";
import type { StrategyReport } from "@/lib/strategy/types";

type PreparedTx =
  | {
      configured: false;
      chainId: number;
      message: string;
    }
  | {
      configured: true;
      chainId: number;
      to: string;
      data: string;
      value: string;
      strategyHash: string;
      metadataURI: string;
    };

type EthereumProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

type TransactionReceipt = {
  blockNumber?: string;
  status?: string;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export function OnchainPublisher() {
  const [report, setReport] = useState<StrategyReport | null>(null);
  const [prepared, setPrepared] = useState<PreparedTx | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void readStoredReportsEverywhere().then((reports) => setReport(reports[0] ?? null));
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  async function prepare() {
    if (!report) return;
    setLoading(true);
    setStatus(null);
    try {
      const response = await fetch("/api/onchain/prepare", {
        method: "POST",
        headers: appApiHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(report)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to prepare transaction.");
      setPrepared(payload);
      setStatus(payload.configured ? "Transaction calldata prepared." : payload.message);
    } catch (caught) {
      setStatus(caught instanceof Error ? caught.message : "Unable to prepare transaction.");
    } finally {
      setLoading(false);
    }
  }

  async function publish() {
    if (!prepared?.configured || !window.ethereum) {
      setStatus("Wallet provider not found. Open this page in a browser with an EIP-1193 wallet.");
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      const from = accounts[0];
      await ensureChain(prepared.chainId);
      const hash = (await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from,
            to: prepared.to,
            data: prepared.data,
            value: prepared.value
          }
        ]
      })) as string;
      setTxHash(hash);
      setStatus("Transaction submitted. Waiting for confirmation.");
      const receipt = await waitForReceipt(hash);
      if (receipt) {
        setStatus(`Strategy attestation confirmed in block ${Number.parseInt(receipt.blockNumber ?? "0x0", 16)}.`);
      } else {
        setStatus("Transaction submitted. Confirmation is still pending in the connected wallet or RPC.");
      }
    } catch (caught) {
      setStatus(caught instanceof Error ? caught.message : "Wallet transaction failed.");
    } finally {
      setLoading(false);
    }
  }

  if (!report) {
    return (
      <section className="surface empty-state">
        <h2>No report ready to publish.</h2>
        <p className="muted-text">Generate and save a strategy report first, then return here to attest its hash on-chain.</p>
        <Link className="button button--primary" href="/">
          Open generator
        </Link>
      </section>
    );
  }

  return (
    <section className="onchain-layout">
      <div className="surface report-panel">
        <p className="eyeline">Latest saved report</p>
        <h2>{report.strategy.name}</h2>
        <p className="muted-text">{report.explanation.summary}</p>
        <div className="hash-box">
          <span>{report.onchain.strategyHash}</span>
          <button className="button button--ghost" type="button" aria-label="Copy strategy hash" onClick={() => navigator.clipboard.writeText(report.onchain.strategyHash)}>
            <Copy size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="surface report-panel">
        <h2>Publish Attestation</h2>
        <p className="muted-text">
          This sends a wallet transaction to the configured registry contract. It records the hash and metadata pointer only; it does not execute a trade.
        </p>
        <div className="action-row">
          <button className="button button--secondary" type="button" onClick={prepare} disabled={loading}>
            {loading ? <Loader2 className="spin" size={16} aria-hidden="true" /> : null}
            Prepare
          </button>
          <button className="button button--primary" type="button" onClick={publish} disabled={loading || !prepared?.configured}>
            <Send size={16} aria-hidden="true" />
            Send transaction
          </button>
        </div>
        {prepared?.configured ? (
          <dl className="spec-list">
            <div>
              <dt>Chain</dt>
              <dd>{prepared.chainId}</dd>
            </div>
            <div>
              <dt>Registry</dt>
              <dd>{prepared.to}</dd>
            </div>
            <div>
              <dt>Metadata</dt>
              <dd>
                Data URI, {formatBytes(prepared.metadataURI.length)}
                <button className="inline-copy" type="button" onClick={() => navigator.clipboard.writeText(prepared.metadataURI)}>
                  Copy
                </button>
              </dd>
            </div>
          </dl>
        ) : null}
        {status ? (
          <p className="form-note" role="status">
            {status}
          </p>
        ) : null}
        {txHash ? (
          <p className="form-note">
            Transaction hash: <span className="mono">{txHash}</span>
            {explorerUrl(txHash) ? (
              <a className="inline-link" href={explorerUrl(txHash)} target="_blank" rel="noreferrer">
                <ExternalLink size={14} aria-hidden="true" />
                Explorer
              </a>
            ) : null}
          </p>
        ) : null}
      </div>
    </section>
  );
}

async function ensureChain(chainId: number) {
  if (!window.ethereum) throw new Error("Wallet provider not found.");
  const hexChain = `0x${chainId.toString(16)}`;
  const currentChain = (await window.ethereum.request({ method: "eth_chainId" })) as string;
  if (currentChain.toLowerCase() === hexChain.toLowerCase()) return;

  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexChain }] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Wallet rejected the chain switch.";
    throw new Error(`Switch wallet to chain ${chainId} before publishing. ${message}`);
  }

  const updatedChain = (await window.ethereum.request({ method: "eth_chainId" })) as string;
  if (updatedChain.toLowerCase() !== hexChain.toLowerCase()) {
    throw new Error(`Wallet is still not connected to chain ${chainId}.`);
  }
}

async function waitForReceipt(hash: string) {
  for (let attempt = 0; attempt < 18; attempt += 1) {
    const receipt = (await window.ethereum?.request({ method: "eth_getTransactionReceipt", params: [hash] })) as TransactionReceipt | null;
    if (receipt?.blockNumber) return receipt;
    await new Promise((resolve) => window.setTimeout(resolve, 4000));
  }
  return null;
}

function explorerUrl(hash: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_TX_URL?.replace(/\/$/, "");
  return baseUrl ? `${baseUrl}/${hash}` : undefined;
}

function formatBytes(length: number) {
  return `${Math.max(1, Math.ceil(length / 1024))} KB`;
}
