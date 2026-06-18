import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StrategyGPT AI",
    short_name: "StrategyGPT",
    description: "Natural-language crypto strategy generation and CoinMarketCap-backed backtesting.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#151826",
    theme_color: "#151826",
    categories: ["finance", "productivity", "utilities"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
}
