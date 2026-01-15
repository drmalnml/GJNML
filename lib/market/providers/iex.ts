import type { MarketProvider, MarketAsset, PricePoint } from "@/lib/market/types";

/**
 * IEX adapter (stub):
 * - Add IEX_CLOUD_API_KEY (or chosen auth)
 * - Implement price fetch for equities/ETFs
 */
export const IexProvider: MarketProvider = {
  name: "iex",
  async getLatestPrices(_assets: MarketAsset[]): Promise<PricePoint[]> {
    throw new Error("IEX provider not configured. Set MARKET_PROVIDER=fake or implement IexProvider.");
  },
};
