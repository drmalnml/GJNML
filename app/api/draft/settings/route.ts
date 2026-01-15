import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase/routeClient";
import { supabaseAdmin } from "@/lib/supabase/adminClient";

export async function POST(req: Request) {
  const supabase = supabaseRoute();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { league_id, pick_seconds, rounds } = await req.json();
  if (!league_id) return NextResponse.json({ error: "league_id required" }, { status: 400 });

  const { data: member } = await supabase
    .from("league_members")
    .select("role")
    .eq("league_id", league_id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!member || member.role !== "admin") return NextResponse.json({ error: "Only commissioner can change settings." }, { status: 403 });

  const { data: state } = await supabaseAdmin.from("draft_state").select("*").eq("league_id", league_id).maybeSingle();
  if (!state) return NextResponse.json({ error: "Draft state not found." }, { status: 404 });

  if (!["not_started", "paused"].includes(state.status)) {
    return NextResponse.json({ error: "Settings can only be changed before start or while paused." }, { status: 409 });
  }

  const upd: any = {};
  if (typeof pick_seconds === "number" && pick_seconds >= 10 && pick_seconds <= 180) upd.pick_seconds = pick_seconds;
  if (typeof rounds === "number" && rounds >= 1 && rounds <= 30) upd.rounds = rounds;

  if (Object.keys(upd).length === 0) return NextResponse.json({ error: "No valid settings provided." }, { status: 400 });

  upd.updated_at = new Date().toISOString();
  await supabaseAdmin.from("draft_state").update(upd).eq("league_id", league_id);

  return NextResponse.json({ ok: true, updated: upd });
}
