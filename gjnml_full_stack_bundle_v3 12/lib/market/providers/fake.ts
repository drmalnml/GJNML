import type { MarketProvider, MarketAsset, PricePoint } from "@/lib/market/types";
import { supabaseAdmin } from "@/lib/supabase/adminClient";

/**
 * FakeProvider (dev/staging):
 * Supports two models via env:
 *
 * FAKE_EQUITY_MODEL=basic (default)
 * - Independent random-walk per asset.
 *
 * FAKE_EQUITY_MODEL=nasdaq
 * - Adds a market-wide factor ("NASDAQ-like") so equities/ETFs move together somewhat.
 * - Each symbol also has idiosyncratic noise, scaled by risk bucket and kind.
 *
 * This gives you a "fake NASDAQ feed" that feels like a real tape (correlation + drift),
 * while keeping crypto (if you use KrakenProvider) live.
 */

function seedPrice(id: string, kind: string) {
  const up = id.toUpperCase();
  if (kind === "crypto") return up === "BTC" ? 45000 : up === "ETH" ? 2500 : 1000;
  if (kind === "etf") return 420;
  if (kind === "index") return up === "IXIC" || up === "NASDAQ" ? 16000 : 5000;
  // equities
  return 150;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function riskScale(risk: string) {
  const r = (risk ?? "medium").toLowerCase();
  if (r === "low") return 0.6;
  if (r === "high") return 1.6;
  return 1.0;
}

function kindBaseVol(kind: string) {
  if (kind === "crypto") return 0.015;
  if (kind === "equity") return 0.008;
  if (kind === "etf") return 0.004;
  if (kind === "index") return 0.003;
  return 0.006;
}

function dailyDrift(kind: string) {
  // tiny positive drift to make charts look alive; can be overridden by env
  const d = Number(process.env.FAKE_DRIFT_BPS ?? "0.5"); // basis points per tick
  const bps = Number.isFinite(d) ? d : 0.5;
  // convert bps to decimal
  return (bps / 10000) * (kind === "crypto" ? 1.0 : 1.0);
}

export const FakeProvider: MarketProvider = {
  name: "fake",
  async getLatestPrices(assets: MarketAsset[]): Promise<PricePoint[]> {
    const model = (process.env.FAKE_EQUITY_MODEL ?? "basic").toLowerCase();
    const now = new Date().toISOString();

    const { data: existing } = await supabaseAdmin.from("asset_prices").select("asset_id, price");
    const priceMap = new Map((existing ?? []).map((r: any) => [r.asset_id, Number(r.price)]));

    // Market-wide factor for NASDAQ-like behavior (used for equities/etfs/indexes)
    // Factor is a bounded normal-ish shock.
    let marketShock = 0;
    if (model === "nasdaq") {
      const factorVol = Number(process.env.FAKE_NASDAQ_FACTOR_VOL ?? "0.0025"); // ~0.25% per tick (tunable)
      const fv = Number.isFinite(factorVol) ? factorVol : 0.0025;
      // Approx normal via sum of uniforms
      const u = (Math.random() + Math.random() + Math.random() + Math.random()) / 4;
      const z = (u - 0.5) * 2; // -1..1
      marketShock = clamp(z * fv, -0.02, 0.02);
    }

    const updates = assets.map((a: any) => {
      const cur = priceMap.has(a.id) ? priceMap.get(a.id)! : seedPrice(a.id, a.kind);
      const baseVol = kindBaseVol(a.kind ?? "equity");
      const rScale = riskScale((a.risk_bucket ?? "medium") as string);

      // idiosyncratic noise
      const idio = (Math.random() * 2 - 1) * baseVol * rScale;

      // factor exposure (betas)
      const beta = a.kind === "equity" ? 1.15 : a.kind === "etf" ? 0.85 : a.kind === "index" ? 1.0 : 0.0;

      const drift = dailyDrift(a.kind ?? "equity");
      const shock = (model === "nasdaq" && (a.kind === "equity" || a.kind === "etf" || a.kind === "index"))
        ? (beta * marketShock + idio + drift)
        : (idio + drift);

      const next = Math.max(0.01, cur * (1 + shock));
      return { asset_id: a.id, price: Number(next.toFixed(4)), as_of: now };
    });

    return updates;
  },
};
