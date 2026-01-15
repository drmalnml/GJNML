import { supabaseAdmin } from "@/lib/supabase/adminClient";

/**
 * MVP auto-pick strategy:
 *  - Respect league pool (if set)
 *  - Exclude already drafted assets
 *  - Diversify by risk bucket and kind
 *  - Prefer filling missing buckets in user's roster (low/med/high)
 */
export async function selectAutoPickAsset(args: { league_id: string; user_id: string }) {
  const { league_id, user_id } = args;

  const { data: pool } = await supabaseAdmin.from("league_assets").select("asset_id").eq("league_id", league_id);
  const poolIds = (pool ?? []).map((r: any) => r.asset_id);

  const { data: drafted } = await supabaseAdmin.from("draft_picks").select("asset_id").eq("league_id", league_id);
  const draftedSet = new Set((drafted ?? []).map((r: any) => r.asset_id).filter(Boolean));

  let q = supabaseAdmin.from("assets").select("id,name,kind,risk_bucket,active").eq("active", true);
  if (poolIds.length > 0) q = q.in("id", poolIds);
  const { data: assets } = await q.order("kind", { ascending: true }).order("id", { ascending: true });

  const available = (assets ?? []).filter((a: any) => !draftedSet.has(a.id));
  if (available.length === 0) return null;

  const { data: roster } = await supabaseAdmin
    .from("rosters")
    .select("asset_id, assets:assets(id,kind,risk_bucket)")
    .eq("league_id", league_id)
    .eq("user_id", user_id);

  const counts = {
    risk: { low: 0, medium: 0, high: 0, unknown: 0 },
    kind: { crypto: 0, equity: 0, etf: 0, index: 0, other: 0 },
  };

  for (const r of roster ?? []) {
    const a = (r as any).assets;
    const rb0 = (a?.risk_bucket ?? "unknown") as string;
    const rb = (rb0 === "low" || rb0 === "medium" || rb0 === "high") ? rb0 : "unknown";
    (counts.risk as any)[rb] += 1;

    const k0 = (a?.kind ?? "other") as string;
    const k = (k0 === "crypto" || k0 === "equity" || k0 === "etf" || k0 === "index") ? k0 : "other";
    (counts.kind as any)[k] += 1;
  }

  const desiredRisk: Array<"low"|"medium"|"high"> = ["low","medium","high"].sort((a,b) => counts.risk[a] - counts.risk[b]);
  const desiredKind: Array<"equity"|"etf"|"crypto"|"index"> = ["equity","etf","crypto","index"].sort((a,b) => counts.kind[a] - counts.kind[b]);

  function score(a: any) {
    const rb = (a.risk_bucket ?? "medium") as string;
    const kind = (a.kind ?? "equity") as string
    let s = 0;

    if (rb === desiredRisk[0]) s += 30;
    else if (rb === desiredRisk[1]) s += 20;
    else if (rb === desiredRisk[2]) s += 10;
    else s += 5;

    if (kind === desiredKind[0]) s += 25;
    else if (kind === desiredKind[1]) s += 18;
    else if (kind === desiredKind[2]) s += 12;
    else s += 6;

    return s;
  }

  const scored = available.map((a: any) => ({ a, s: score(a) }));
  scored.sort((x,y) => (y.s - x.s) || String(x.a.id).localeCompare(String(y.a.id)));
  const top = scored[0].a;

  return { asset_id: top.id, reason: { risk: top.risk_bucket ?? "medium", kind: top.kind ?? "equity" } };
}
