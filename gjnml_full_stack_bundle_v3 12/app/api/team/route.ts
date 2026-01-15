import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase/routeClient";

export async function GET(req: Request) {
  const supabase = supabaseRoute();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const league_id = String(searchParams.get("league_id") ?? "");
  if (!league_id) return NextResponse.json({ error: "league_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("rosters")
    .select("asset_id, assets:assets(id,name,kind)")
    .eq("league_id", league_id)
    .eq("user_id", auth.user.id)
    .order("asset_id", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ roster: data ?? [] });
}
