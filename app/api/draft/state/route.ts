import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase/routeClient";

export async function GET(req: Request) {
  const supabase = supabaseRoute();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const league_id = String(searchParams.get("league_id") ?? "");
  if (!league_id) return NextResponse.json({ error: "league_id required" }, { status: 400 });

  const { data: state, error: sErr } = await supabase.from("draft_state").select("*").eq("league_id", league_id).maybeSingle();
  const { data: order, error: oErr } = await supabase.from("draft_order").select("*").eq("league_id", league_id).order("slot", { ascending: true });
  const { data: picks, error: pErr } = await supabase.from("draft_picks").select("*").eq("league_id", league_id).order("pick_number", { ascending: true });

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  return NextResponse.json({ state, order, picks, user_id: auth.user.id });
}
