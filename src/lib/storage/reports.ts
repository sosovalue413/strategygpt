import { appApiHeaders } from "@/lib/client/api";
import { strategyReportSchema, type StrategyReport } from "@/lib/strategy/types";

const historyKey = "strategygpt.history";
const historyVersion = 2;
const maxStoredReports = 6;

type StoredHistory = {
  version: typeof historyVersion;
  reports: StrategyReport[];
};

export function readStoredReports() {
  try {
    const raw = localStorage.getItem(historyKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    const records = Array.isArray(parsed) ? parsed : isStoredHistory(parsed) ? parsed.reports : [];
    return records.flatMap((item) => {
      const result = strategyReportSchema.safeParse(item);
      return result.success ? [result.data] : [];
    });
  } catch {
    localStorage.removeItem(historyKey);
    return [];
  }
}

function isStoredHistory(value: unknown): value is StoredHistory {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as { version?: unknown }).version === historyVersion &&
      Array.isArray((value as { reports?: unknown }).reports)
  );
}

export async function readStoredReportsEverywhere() {
  const local = readStoredReports();
  try {
    const response = await fetch("/api/reports", {
      headers: appApiHeaders()
    });
    if (!response.ok) return local;
    const payload = (await response.json()) as { reports?: unknown[] };
    const remote = (payload.reports ?? []).flatMap((item) => {
      const result = strategyReportSchema.safeParse(item);
      return result.success ? [result.data] : [];
    });
    return mergeReports(remote, local);
  } catch {
    return local;
  }
}

export async function persistStoredReport(report: StrategyReport) {
  const existing = readStoredReports();
  const next = [report, ...existing.filter((item) => item.id !== report.id)].slice(0, maxStoredReports);
  writeStoredReports(next);
  try {
    await fetch("/api/reports", {
      method: "POST",
      headers: appApiHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(report)
    });
  } catch {
    // Browser storage remains the offline fallback when the server store is unavailable.
  }
  return next.length;
}

export async function clearStoredReports() {
  localStorage.removeItem(historyKey);
  try {
    await fetch("/api/reports", {
      method: "DELETE",
      headers: appApiHeaders()
    });
  } catch {
    // Local clear still succeeds even if the server store cannot be reached.
  }
}

function writeStoredReports(reports: StrategyReport[]) {
  const payload: StoredHistory = {
    version: historyVersion,
    reports
  };
  try {
    localStorage.setItem(historyKey, JSON.stringify(payload));
  } catch {
    const compactPayload: StoredHistory = {
      version: historyVersion,
      reports: reports.slice(0, 3)
    };
    localStorage.setItem(historyKey, JSON.stringify(compactPayload));
  }
}

function mergeReports(primary: StrategyReport[], secondary: StrategyReport[]) {
  const byId = new Map<string, StrategyReport>();
  for (const report of [...primary, ...secondary]) {
    byId.set(report.id, report);
  }
  return [...byId.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
