import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase/routeClient";
import { supabaseAdmin } from "@/lib/supabase/adminClient";

/**
 * League assets:
 * - GET: returns active assets + whether they are included in league asset pool.
 * - PATCH: commissioner/admin can update league pool membership + asset metadata fields (kraken_pair).
 *
 * Query params:
 * - league_id (required)
 */
export async function GET(req: Request) {
  const supabase = supabaseRoute();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const league_id = searchParams.get("league_id");
  if (!league_id) return NextResponse.json({ error: "league_id required" }, { status: 400 });

  const { data: member } = await supabase
    .from("league_members")
    .select("role")
    .eq("league_id", league_id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!member) return NextResponse.json({ error: "Not a member." }, { status: 403 });

  const { data: assets, error: aErr } = await supabaseAdmin
    .from("assets")
    .select("id,name,kind,risk_bucket,active,kraken_pair")
    .eq("active", true)
    .order("kind", { ascending: true })
    .order("id", { ascending: true });

  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

  const { data: pool, error: pErr } = await supabaseAdmin
    .from("league_asset_pool")
    .select("asset_id")
    .eq("league_id", league_id);

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  const inPool = new Set((pool ?? []).map((r: any) => r.asset_id));

  const rows = (assets ?? []).map((a: any) => ({
    ...a,
    in_pool: inPool.has(a.id),
  }));

  return NextResponse.json({ ok: true, rows });
}

export async function PATCH(req: Request) {
  const supabase = supabaseRoute();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const league_id = body?.league_id as string | undefined;
  if (!league_id) return NextResponse.json({ error: "league_id required" }, { status: 400 });

  const { data: member } = await supabase
    .from("league_members")
    .select("role")
    .eq("league_id", league_id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  const role = (member as any)?.role as string | undefined;
  if (!role || (role !== "commissioner" && role !== "admin")) {
    return NextResponse.json({ error: "Commissioner only." }, { status: 403 });
  }

  // Optional updates:
  // - toggle pool membership: { asset_id, in_pool }
  // - update kraken_pair: { asset_id, kraken_pair }
  const asset_id = body?.asset_id as string | undefined;
  if (!asset_id) return NextResponse.json({ error: "asset_id required" }, { status: 400 });

  const updates: any[] = [];
  if ("kraken_pair" in (body ?? {})) {
    const kraken_pair = (body?.kraken_pair ?? null) as string | null;
    const { error: uErr } = await supabaseAdmin
      .from("assets")
      .update({ kraken_pair })
      .eq("id", asset_id);
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
    updates.push("kraken_pair");
  }

  if ("in_pool" in (body ?? {})) {
    const in_pool = Boolean(body?.in_pool);
    if (in_pool) {
      const { error: iErr } = await supabaseAdmin
        .from("league_asset_pool")
        .insert({ league_id, asset_id });
      // ignore unique violation-like errors (pool already contains)
      if (iErr && !String(iErr.message).toLowerCase().includes("duplicate")) {
        return NextResponse.json({ error: iErr.message }, { status: 500 });
      }
    } else {
      const { error: dErr } = await supabaseAdmin
        .from("league_asset_pool")
        .delete()
        .eq("league_id", league_id)
        .eq("asset_id", asset_id);
      if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });
    }
    updates.push("in_pool");
  }

  return NextResponse.json({ ok: true, updates });
}
