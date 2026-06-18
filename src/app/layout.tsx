import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppFooter } from "@/components/layout/app-footer";
import { AppNav } from "@/components/layout/app-nav";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "StrategyGPT AI",
    template: "%s | StrategyGPT AI"
  },
  description:
    "Generate explainable crypto trading strategies from natural language, backtest them with CoinMarketCap data, and attest strategy hashes on-chain.",
  applicationName: "StrategyGPT AI",
  keywords: [
    "crypto strategy",
    "CoinMarketCap",
    "backtesting",
    "technical indicators",
    "on-chain attestations"
  ],
  authors: [{ name: "StrategyGPT AI" }],
  creator: "StrategyGPT AI",
  alternates: {
    canonical: "/"
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: ["/icon.svg"],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }]
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "StrategyGPT AI",
    description:
      "Natural language crypto strategy generation, real market data backtesting, and on-chain strategy attestations.",
    type: "website",
    siteName: "StrategyGPT AI",
    url: "/",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "StrategyGPT AI strategy research workbench"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "StrategyGPT AI",
    description:
      "Turn a trading idea into rules, backtest metrics, risk notes, and an on-chain strategy hash.",
    images: ["/twitter-image"]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#151826"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <AppNav />
          <main>{children}</main>
          <AppFooter />
        </div>
      </body>
    </html>
  );
}
