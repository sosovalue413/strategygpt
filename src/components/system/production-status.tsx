"use client";

import { useEffect, useState } from "react";
import { appApiHeaders } from "@/lib/client/api";

type HealthPayload = {
  services: {
    openai: boolean;
    coinMarketCap: boolean;
    onchainRegistry: boolean;
    apiAccessToken: boolean;
    reportStore: "postgres" | "file" | "volatile-file";
    redisRateLimit: boolean;
    metrics: boolean;
  };
  defaultChainId: number;
};

export function ProductionStatus() {
  const [health, setHealth] = useState<HealthPayload | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void fetch("/api/health", { headers: appApiHeaders() })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: HealthPayload | null) => setHealth(payload))
        .catch(() => setHealth(null));
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  if (!health) return null;

  const items = [
    { label: "OpenAI", ok: health.services.openai },
    { label: "CoinMarketCap", ok: health.services.coinMarketCap },
    { label: "Registry", ok: health.services.onchainRegistry },
    { label: health.services.reportStore === "postgres" ? "Postgres" : health.services.reportStore === "volatile-file" ? "Volatile store" : "File store", ok: health.services.reportStore !== "volatile-file" },
    { label: "Redis rate limit", ok: health.services.redisRateLimit },
    { label: "API gate", ok: health.services.apiAccessToken },
    { label: "Metrics", ok: health.services.metrics }
  ];

  return (
    <section className="surface status-strip" aria-label="Production status">
      {items.map((item) => (
        <span className={item.ok ? "status-pill status-pill--ok" : "status-pill status-pill--warn"} key={item.label}>
          {item.label}
        </span>
      ))}
    </section>
  );
}
