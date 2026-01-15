import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase/routeClient";
import { supabaseAdmin } from "@/lib/supabase/adminClient";

export async function POST(req: Request) {
  const supabase = supabaseRoute();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json();
  const league_id = String(body.league_id ?? "");
  const asset_ids = Array.isArray(body.asset_ids) ? body.asset_ids.map((x: any) => String(x).toUpperCase()) : [];

  if (!league_id) return NextResponse.json({ error: "league_id required" }, { status: 400 });

  const { data: member } = await supabase.from("league_members").select("role").eq("league_id", league_id).eq("user_id", auth.user.id).maybeSingle();
  if (!member) return NextResponse.json({ error: "Not a league member." }, { status: 403 });
  if (member.role !== "admin") return NextResponse.json({ error: "Only the commissioner/admin can set the asset pool." }, { status: 403 });

  // wipe pool then insert selected
  const { error: delErr } = await supabaseAdmin.from("league_assets").delete().eq("league_id", league_id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  if (asset_ids.length > 0) {
    const rows = asset_ids.map((id: string) => ({ league_id, asset_id: id }));
    const { error: insErr } = await supabaseAdmin.from("league_assets").insert(rows);
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ status: "ok", count: asset_ids.length });
}
