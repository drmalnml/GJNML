import type { MarketProvider, MarketAsset, PricePoint } from "@/lib/market/types";

/**
 * Polygon.io adapter (stub):
 * - Add POLYGON_API_KEY in env
 * - Implement symbol mapping (assets.id -> Polygon ticker)
 * - Fetch last trade/quote or aggregates as desired
 *
 * NOTE: Kept as a stub so the project compiles cleanly without extra deps.
 */
export const PolygonProvider: MarketProvider = {
  name: "polygon",
  async getLatestPrices(_assets: MarketAsset[]): Promise<PricePoint[]> {
    throw new Error("Polygon provider not configured. Set MARKET_PROVIDER=fake or implement PolygonProvider.");
  },
};
