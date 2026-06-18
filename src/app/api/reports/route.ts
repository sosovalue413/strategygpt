import { NextResponse } from "next/server";
import { requireApiAccess } from "@/lib/server/auth";
import { checkRateLimit, isRequestBodyTooLarge, rateLimitResponse, requestTooLargeResponse } from "@/lib/server/rate-limit";
import { clearStoredReports, listStoredReports, saveStoredReport } from "@/lib/server/report-store";
import { recordApiMetric } from "@/lib/server/telemetry";
import { strategyReportSchema } from "@/lib/strategy/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const started = Date.now();
  let status = 200;
  try {
    const auth = requireApiAccess(request);
    if (auth) {
      status = 401;
      return auth;
    }
    const rateLimit = await checkRateLimit(request, "reports-read", { max: 60, windowMs: 60_000 });
    if (!rateLimit.ok) {
      status = 429;
      return rateLimitResponse(rateLimit);
    }
    const reports = await listStoredReports(30);
    return NextResponse.json({ reports });
  } catch (error) {
    status = 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to read reports." }, { status });
  } finally {
    recordApiMetric("/api/reports:get", status, Date.now() - started);
  }
}

export async function POST(request: Request) {
  const started = Date.now();
  let status = 200;
  try {
    const auth = requireApiAccess(request);
    if (auth) {
      status = 401;
      return auth;
    }
    if (isRequestBodyTooLarge(request, 1_500_000)) {
      status = 413;
      return requestTooLargeResponse(1_500_000);
    }
    const rateLimit = await checkRateLimit(request, "reports-write", { max: 30, windowMs: 60_000 });
    if (!rateLimit.ok) {
      status = 429;
      return rateLimitResponse(rateLimit);
    }
    const report = strategyReportSchema.parse(await request.json());
    await saveStoredReport(report);
    return NextResponse.json({ ok: true });
  } catch (error) {
    status = 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save report." }, { status });
  } finally {
    recordApiMetric("/api/reports:post", status, Date.now() - started);
  }
}

export async function DELETE(request: Request) {
  const started = Date.now();
  let status = 200;
  try {
    const auth = requireApiAccess(request);
    if (auth) {
      status = 401;
      return auth;
    }
    const rateLimit = await checkRateLimit(request, "reports-clear", { max: 5, windowMs: 60_000 });
    if (!rateLimit.ok) {
      status = 429;
      return rateLimitResponse(rateLimit);
    }
    await clearStoredReports();
    return NextResponse.json({ ok: true });
  } catch (error) {
    status = 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to clear reports." }, { status });
  } finally {
    recordApiMetric("/api/reports:delete", status, Date.now() - started);
  }
}
