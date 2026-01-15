import type { MarketProvider, MarketAsset, PricePoint } from "@/lib/market/types";
import { FakeProvider } from "@/lib/market/providers/fake";
import { supabaseAdmin } from "@/lib/supabase/adminClient";

/**
 * Kraken provider (LIVE crypto feed via public endpoints):
 * - Uses Kraken public Ticker endpoint (no auth required) to fetch last trade price.
 *
 * Mapping strategy (clean + explicit):
 * 1) If `assets.kraken_pair` is set, we use it directly (recommended for accuracy).
 *    Examples: XXBTZUSD, XETHZUSD, SOLUSD, DOGEUSD
 * 2) Otherwise we fall back to a best-effort guess: BTC->XBT, then <BASE>USD.
 *
 * Behavior:
 * - For crypto assets: real prices from Kraken (USD pairs).
 * - For non-crypto assets: falls back to FakeProvider so the app keeps running.
 */

function toKrakenBase(symbol: string) {
  const s = symbol.toUpperCase();
  if (s === "BTC") return "XBT";
  return s;
}

function guessPair(symbol: string) {
  const base = toKrakenBase(symbol);
  return `${base}USD`;
}

async function fetchTicker(pairs: string[]): Promise<Record<string, any>> {
  const url = new URL("https://api.kraken.com/0/public/Ticker");
  url.searchParams.set("pair", pairs.join(","));

  const res = await fetch(url.toString(), {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) throw new Error(`Kraken HTTP ${res.status}`);
  const json = await res.json();
  if (json?.error?.length) throw new Error(`Kraken error: ${json.error.join(", ")}`);
  return json?.result ?? {};
}

export const KrakenProvider: MarketProvider = {
  name: "kraken",
  async getLatestPrices(assets: MarketAsset[]): Promise<PricePoint[]> {
    const now = new Date().toISOString();
    const crypto = assets.filter((a) => a.kind === "crypto");
    const other = assets.filter((a) => a.kind !== "crypto");

    // Fallback for non-crypto so app keeps producing prices for valuation
    const fallback = other.length ? await FakeProvider.getLatestPrices(other) : [];

    if (!crypto.length) return fallback;

    // Pull optional kraken_pair mappings from DB
    const { data: mapped, error: mErr } = await supabaseAdmin
      .from("assets")
      .select("id, kraken_pair")
      .in("id", crypto.map((c) => c.id));

    if (mErr) {
      // mapping is optional; continue with guesses
    }

    const pairByAsset = new Map<string, string>();
    for (const a of crypto) {
      pairByAsset.set(a.id, guessPair(a.id));
    }
    for (const row of mapped ?? []) {
      if ((row as any).kraken_pair) {
        pairByAsset.set((row as any).id, String((row as any).kraken_pair));
      }
    }

    const pairs = crypto.map((a) => pairByAsset.get(a.id) as string);
    let result: Record<string, any> = {};

    try {
      result = await fetchTicker(pairs);
    } catch (_e: any) {
      // If Kraken is down, fail soft by using fake feed for crypto too.
      const soft = await FakeProvider.getLatestPrices(crypto);
      return [...fallback, ...soft];
    }

    const points: PricePoint[] = [];
    for (const a of crypto) {
      const requested = pairByAsset.get(a.id) as string;

      // Kraken result keys sometimes differ; attempt direct key, else fuzzy match using requested base chars.
      let rec = result[requested];
      if (!rec) {
        const base = requested.replace(/USD$/i, "").replace(/[^A-Z]/gi, "");
        const key = Object.keys(result).find((k) => k.toUpperCase().includes(base) && k.toUpperCase().includes("USD"));
        if (key) rec = result[key];
      }

      const last = rec?.c?.[0];
      const price = last ? Number(last) : NaN;
      if (!Number.isFinite(price)) continue;

      points.push({ asset_id: a.id, price, as_of: now });
    }

    // If some crypto pairs were not found, soft-fill missing ones from fake feed
    if (points.length < crypto.length) {
      const got = new Set(points.map((p) => p.asset_id));
      const missing = crypto.filter((a) => !got.has(a.id));
      const soft = missing.length ? await FakeProvider.getLatestPrices(missing) : [];
      return [...fallback, ...points, ...soft];
    }

    return [...fallback, ...points];
  },
};
