import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/adminClient";

export async function GET() {
  const { data: prices, error: pErr } = await supabaseAdmin
    .from("asset_prices")
    .select("asset_id, price, as_of")
    .order("asset_id", { ascending: true });

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  const { data: assets } = await supabaseAdmin
    .from("assets")
    .select("id,name,kind")
    .eq("active", true);

  const aMap = new Map((assets ?? []).map((a: any) => [a.id, a]));
  const rows = (prices ?? []).map((p: any) => {
    const a = aMap.get(p.asset_id);
    return {
      asset_id: p.asset_id,
      price: Number(p.price),
      as_of: p.as_of,
      kind: a?.kind ?? null,
      name: a?.name ?? null,
    };
  });

  return NextResponse.json({ ok: true, rows });
}
