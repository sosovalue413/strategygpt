import { promises as fs } from "node:fs";
import { Pool } from "pg";
import { verifyStrategyReportProof } from "@/lib/strategy/proof";
import { strategyReportSchema, type StrategyReport } from "@/lib/strategy/types";
import { getServerEnv } from "@/lib/env";

type StoredReportRow = {
  id: string;
  report: StrategyReport;
};

let pool: Pool | undefined;

export function reportStoreMode() {
  if (getServerEnv().databaseUrl) return "postgres";
  return process.env.VERCEL ? "volatile-file" : "file";
}

export async function listStoredReports(limit = 20): Promise<StrategyReport[]> {
  if (getServerEnv().databaseUrl) {
    const client = await getPool().connect();
    try {
      await ensurePostgresSchema(client);
      const result = await client.query<{ report: unknown }>("select report from strategy_reports order by created_at desc limit $1", [limit]);
      return result.rows.flatMap((row) => parseReport(row.report));
    } finally {
      client.release();
    }
  }

  const rows = await readFileRows();
  return rows
    .flatMap((row) => parseReport(row.report))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, limit);
}

export async function saveStoredReport(report: StrategyReport) {
  const proof = verifyStrategyReportProof(report);
  if (getServerEnv().databaseUrl) {
    const client = await getPool().connect();
    try {
      await ensurePostgresSchema(client);
      await client.query(
        `insert into strategy_reports (id, strategy_hash, symbol, created_at, report)
         values ($1, $2, $3, $4, $5)
         on conflict (id) do update set strategy_hash = excluded.strategy_hash, symbol = excluded.symbol, created_at = excluded.created_at, report = excluded.report`,
        [report.id, proof.strategyHash, report.market.symbol, report.createdAt, JSON.stringify(report)]
      );
    } finally {
      client.release();
    }
    return report;
  }

  const rows = await readFileRows();
  const nextRows = [{ id: report.id, report }, ...rows.filter((row) => row.id !== report.id)].slice(0, 100);
  await writeFileRows(nextRows);
  return report;
}

export async function clearStoredReports() {
  if (getServerEnv().databaseUrl) {
    const client = await getPool().connect();
    try {
      await ensurePostgresSchema(client);
      await client.query("delete from strategy_reports");
    } finally {
      client.release();
    }
    return;
  }
  await writeFileRows([]);
}

function getPool() {
  const databaseUrl = getServerEnv().databaseUrl;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }
  pool ??= new Pool({
    connectionString: databaseUrl,
    max: 5,
    idleTimeoutMillis: 30_000
  });
  return pool;
}

async function ensurePostgresSchema(client: { query: (sql: string, values?: unknown[]) => Promise<unknown> }) {
  await client.query(`
    create table if not exists strategy_reports (
      id text primary key,
      strategy_hash text not null unique,
      symbol text not null,
      created_at timestamptz not null,
      report jsonb not null
    )
  `);
  await client.query("create index if not exists strategy_reports_created_at_idx on strategy_reports (created_at desc)");
}

async function readFileRows(): Promise<StoredReportRow[]> {
  try {
    const raw = await fs.readFile(fileStorePath(), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((row) => {
      if (!row || typeof row !== "object") return [];
      const id = (row as { id?: unknown }).id;
      const report = (row as { report?: unknown }).report;
      return typeof id === "string" ? [{ id, report: report as StrategyReport }] : [];
    });
  } catch (error) {
    if (isMissingFile(error)) return [];
    throw error;
  }
}

async function writeFileRows(rows: StoredReportRow[]) {
  const target = fileStorePath();
  await fs.mkdir(fileStoreDir(), { recursive: true });
  await fs.writeFile(target, JSON.stringify(rows, null, 2));
}

function fileStorePath() {
  if (process.env.VERCEL) {
    return "/tmp/strategygpt-reports.json";
  }
  return ".data/strategy-reports.json";
}

function fileStoreDir() {
  return process.env.VERCEL ? "/tmp" : ".data";
}

function parseReport(value: unknown) {
  const parsed = strategyReportSchema.safeParse(value);
  if (!parsed.success) return [];
  try {
    verifyStrategyReportProof(parsed.data);
    return [parsed.data];
  } catch {
    return [];
  }
}

function isMissingFile(error: unknown) {
  return Boolean(error && typeof error === "object" && (error as { code?: unknown }).code === "ENOENT");
}
