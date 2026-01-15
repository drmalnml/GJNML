import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/adminClient";
import { getMarketProvider, fetchPrices } from "@/lib/market/provider";
import type { MarketAsset } from "@/lib/market/types";

/**
 * Cron wrapper for market tick.
 * Uses Authorization: Bearer $CRON_SECRET (optional).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { data: assets, error: aErr } = await supabaseAdmin
    .from("assets")
    .select("id, kind, risk_bucket")
    .eq("active", true);

  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });
  if (!assets?.length) return NextResponse.json({ ok: true, updated: 0 });

  const provider = getMarketProvider();
  const marketAssets: MarketAsset[] = (assets ?? []).map((a: any) => ({
    id: a.id,
    kind: a.kind,
    risk_bucket: a.risk_bucket,
  }));

  let points;
  try {
    points = await fetchPrices(provider, marketAssets);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Market provider error", provider: provider.name }, { status: 500 });
  }

  const { error: uErr } = await supabaseAdmin
    .from("asset_prices")
    .upsert(points, { onConflict: "asset_id" });

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, provider: provider.name, updated: points.length });
}
