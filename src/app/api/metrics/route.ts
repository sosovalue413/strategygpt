import { renderPrometheusMetrics } from "@/lib/server/telemetry";

export const runtime = "nodejs";

export async function GET() {
  return new Response(renderPrometheusMetrics(), {
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8"
    }
  });
}
