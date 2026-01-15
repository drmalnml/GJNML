import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase/routeClient";

export async function GET(req: Request) {
  const supabase = supabaseRoute();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const league_id = String(searchParams.get("league_id") ?? "");
  if (!league_id) return NextResponse.json({ error: "league_id required" }, { status: 400 });

  const { data: member } = await supabase.from("league_members").select("role").eq("league_id", league_id).eq("user_id", auth.user.id).maybeSingle();
  if (!member) return NextResponse.json({ error: "Not a league member." }, { status: 403 });

  const { data: pool } = await supabase.from("league_assets").select("asset_id").eq("league_id", league_id);
  const poolIds = (pool ?? []).map((r: any) => r.asset_id);

  const { data: drafted } = await supabase.from("draft_picks").select("asset_id").eq("league_id", league_id);
  const draftedSet = new Set((drafted ?? []).map((r: any) => r.asset_id));

  let q = supabase.from("assets").select("id,name,kind,risk_bucket,active").eq("active", true);
  if (poolIds.length > 0) q = q.in("id", poolIds);
  const { data: assets, error } = await q.order("kind", { ascending: true }).order("id", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const available = (assets ?? []).filter((a: any) => !draftedSet.has(a.id));
  return NextResponse.json({ available });
}
