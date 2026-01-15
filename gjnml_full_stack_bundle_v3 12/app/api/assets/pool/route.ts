import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase/routeClient";

export async function GET(req: Request) {
  const supabase = supabaseRoute();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const league_id = String(searchParams.get("league_id") ?? "");
  if (!league_id) return NextResponse.json({ error: "league_id required" }, { status: 400 });

  // Must be a league member to view pool
  const { data: member } = await supabase.from("league_members").select("role").eq("league_id", league_id).eq("user_id", auth.user.id).maybeSingle();
  if (!member) return NextResponse.json({ error: "Not a league member." }, { status: 403 });

  const { data: assets, error: aErr } = await supabase.from("assets").select("*").eq("active", true).order("kind", { ascending: true }).order("id", { ascending: true });
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

  const { data: pool, error: pErr } = await supabase.from("league_assets").select("asset_id").eq("league_id", league_id);
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  const selected = (pool ?? []).map((r: any) => r.asset_id);
  return NextResponse.json({ assets: assets ?? [], selected });
}
