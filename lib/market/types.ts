export type AssetKind = "equity" | "etf" | "crypto" | "index";

export type MarketAsset = {
  id: string;          // matches assets.id (e.g. AAPL, BTC, SPY)
  kind: AssetKind;
  risk_bucket?: "low" | "medium" | "high" | string | null;
};

export type PricePoint = {
  asset_id: string;
  price: number;
  as_of: string; // ISO timestamp
};

export interface MarketProvider {
  name: string;
  /**
   * Return latest prices for the provided assets.
   * The adapter is responsible for mapping assets to provider-specific symbols where needed.
   */
  getLatestPrices(assets: MarketAsset[]): Promise<PricePoint[]>;
}
