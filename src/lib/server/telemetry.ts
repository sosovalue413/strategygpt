type ApiMetric = {
  count: number;
  errors: number;
  totalDurationMs: number;
};

const startedAt = Date.now();
const apiMetrics = new Map<string, ApiMetric>();

export function recordApiMetric(route: string, status: number, durationMs: number) {
  const metric = apiMetrics.get(route) ?? { count: 0, errors: 0, totalDurationMs: 0 };
  metric.count += 1;
  metric.totalDurationMs += durationMs;
  if (status >= 400) {
    metric.errors += 1;
  }
  apiMetrics.set(route, metric);
}

export function renderPrometheusMetrics() {
  const lines = [
    "# HELP strategygpt_uptime_seconds Process uptime in seconds.",
    "# TYPE strategygpt_uptime_seconds gauge",
    `strategygpt_uptime_seconds ${Math.round((Date.now() - startedAt) / 1000)}`,
    "# HELP strategygpt_api_requests_total API requests by route.",
    "# TYPE strategygpt_api_requests_total counter",
    "# HELP strategygpt_api_errors_total API errors by route.",
    "# TYPE strategygpt_api_errors_total counter",
    "# HELP strategygpt_api_duration_ms_avg Average API duration by route.",
    "# TYPE strategygpt_api_duration_ms_avg gauge"
  ];

  for (const [route, metric] of apiMetrics) {
    const label = `route="${escapeLabel(route)}"`;
    lines.push(`strategygpt_api_requests_total{${label}} ${metric.count}`);
    lines.push(`strategygpt_api_errors_total{${label}} ${metric.errors}`);
    lines.push(`strategygpt_api_duration_ms_avg{${label}} ${metric.count === 0 ? 0 : metric.totalDurationMs / metric.count}`);
  }

  return `${lines.join("\n")}\n`;
}

function escapeLabel(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
