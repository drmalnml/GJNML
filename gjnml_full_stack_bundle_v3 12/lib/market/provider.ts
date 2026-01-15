import type { MarketProvider, MarketAsset, PricePoint } from "@/lib/market/types";
import { FakeProvider } from "@/lib/market/providers/fake";
import { PolygonProvider } from "@/lib/market/providers/polygon";
import { IexProvider } from "@/lib/market/providers/iex";
import { KrakenProvider } from "@/lib/market/providers/kraken";

export function getMarketProvider(): MarketProvider {
  const name = (process.env.MARKET_PROVIDER ?? "fake").toLowerCase();
  switch (name) {
    case "polygon":
      return PolygonProvider;
    case "iex":
      return IexProvider;
    case "kraken":
      return KrakenProvider;
    case "fake":
    default:
      return FakeProvider;
  }
}

export async function fetchPrices(provider: MarketProvider, assets: MarketAsset[]): Promise<PricePoint[]> {
  return provider.getLatestPrices(assets);
}
