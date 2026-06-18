import { ImageResponse } from "next/og";

export const alt = "StrategyGPT AI strategy research workbench";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#151826",
          color: "#f7f4ec",
          padding: 72,
          fontFamily: "Arial"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#f3b94d",
              color: "#151826",
              fontSize: 34,
              fontWeight: 800
            }}
          >
            SG
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 34, fontWeight: 800 }}>StrategyGPT AI</div>
            <div style={{ fontSize: 24, color: "#d4d0c5" }}>Natural-language crypto strategy research</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ maxWidth: 920, fontSize: 76, lineHeight: 0.95, fontWeight: 900, letterSpacing: 0 }}>Chat with the market.</div>
          <div style={{ maxWidth: 960, fontSize: 31, lineHeight: 1.3, color: "#d4d0c5" }}>
            CoinMarketCap data, deterministic backtests, risk analysis, and on-chain strategy attestations in one production workbench.
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 22, color: "#151826" }}>
          {["OpenAI parser", "CMC candles", "StrategyRegistry proof"].map((label) => (
            <div key={label} style={{ background: "#f7f4ec", borderRadius: 999, padding: "14px 22px", fontWeight: 700 }}>
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
