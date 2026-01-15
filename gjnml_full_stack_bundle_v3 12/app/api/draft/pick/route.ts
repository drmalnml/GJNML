import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase/routeClient";
import { supabaseAdmin } from "@/lib/supabase/adminClient";
import { snakeSlotForPick, totalPicks } from "@/lib/draft/engine";

async function isAllowedAsset(league_id: string, asset_id: string) {
  const { data: pool } = await supabaseAdmin.from("league_assets").select("asset_id").eq("league_id", league_id);
  const poolIds = (pool ?? []).map((r: any) => r.asset_id);
  if (poolIds.length === 0) return true; // default: all assets allowed
  return poolIds.includes(asset_id);
}

export async function POST(req: Request) {
  const supabase = supabaseRoute();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json();
  const league_id = String(body.league_id);
  const asset_id = String(body.asset_id).toUpperCase();
  if (!league_id || !asset_id) return NextResponse.json({ error: "league_id and asset_id required." }, { status: 400 });

  const { data: state } = await supabaseAdmin.from("draft_state").select("*").eq("league_id", league_id).single();
  const { data: order } = await supabaseAdmin.from("draft_order").select("*").eq("league_id", league_id).order("slot", { ascending: true });

  if (!state || !order?.length) return NextResponse.json({ error: "Draft not initialized." }, { status: 400 });
  if (state.status !== "live") return NextResponse.json({ error: "Draft is not live." }, { status: 409 });

  // Deadline enforcement
  if (state.pick_deadline_at && new Date(state.pick_deadline_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Pick timer expired. Waiting for auto-pick/skip." }, { status: 409 });
  }

  const allowed = await isAllowedAsset(league_id, asset_id);
  if (!allowed) return NextResponse.json({ error: "That asset is not in the league’s allowed pool." }, { status: 400 });

  const teamCount = order.length;
  const currentPickNumber = state.current_pick + 1;
  const maxPick = totalPicks(teamCount, state.rounds);
  if (currentPickNumber > maxPick) return NextResponse.json({ error: "Draft already completed." }, { status: 409 });

  const { round, slot } = snakeSlotForPick({ pickNumber: currentPickNumber, teamCount });
  const slotRow = order.find((r: any) => r.slot === slot);
  if (!slotRow) return NextResponse.json({ error: "Draft order missing slot." }, { status: 500 });
  if (slotRow.user_id !== auth.user.id) return NextResponse.json({ error: "Not your turn." }, { status: 403 });

  const { error: pickErr } = await supabaseAdmin.from("draft_picks").insert({
    league_id, pick_number: currentPickNumber, round, slot, user_id: auth.user.id, asset_id, source: "user"
  });
  if (pickErr) return NextResponse.json({ error: pickErr.message }, { status: 409 });

  const { error: rErr } = await supabaseAdmin.from("rosters").insert({ league_id, user_id: auth.user.id, asset_id });
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

  const nextPick = state.current_pick + 1;
  const nextStatus = nextPick >= maxPick ? "completed" : "live";
  const nextDeadline = nextStatus === "live" ? new Date(Date.now() + state.pick_seconds * 1000).toISOString() : null;

  const { error: sErr } = await supabaseAdmin.from("draft_state").update({
    current_pick: nextPick,
    status: nextStatus,
    pick_deadline_at: nextDeadline,
    updated_at: new Date().toISOString()
  }).eq("league_id", league_id);
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  if (nextStatus === "completed") await supabaseAdmin.from("leagues").update({ status: "active" }).eq("id", league_id);
  return NextResponse.json({ status: "picked", pick_number: currentPickNumber, round, slot, next_status: nextStatus });
}
