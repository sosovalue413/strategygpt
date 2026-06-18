"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { EquityPoint } from "@/lib/strategy/types";
import { formatCurrency } from "@/lib/utils/format";

export function EquityChart({ data }: { data: EquityPoint[] }) {
  return (
    <div className="chart-frame" aria-label="Equity curve chart">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ left: 0, right: 16, top: 18, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-rule)" vertical={false} />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            tick={{ fill: "var(--color-ink-soft)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            tickFormatter={(value) => formatCurrency(Number(value), 0)}
            tick={{ fill: "var(--color-ink-soft)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={76}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-paper-2)",
              border: "1px solid var(--color-rule)",
              borderRadius: "var(--radius-md)",
              color: "var(--color-ink)"
            }}
            formatter={(value) => [formatCurrency(Number(value)), "Equity"]}
            labelFormatter={(value) => new Date(String(value)).toLocaleString()}
          />
          <Area type="monotone" dataKey="equity" stroke="var(--color-accent)" fill="var(--color-accent)" fillOpacity={0.18} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
