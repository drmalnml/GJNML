import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase/routeClient";
import { supabaseAdmin } from "@/lib/supabase/adminClient";
import { snakeSlotForPick, totalPicks } from "@/lib/draft/engine";

export async function POST(req: Request) {
  const supabase = supabaseRoute();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { league_id, asset_id } = await req.json();
  if (!league_id || !asset_id) return NextResponse.json({ error: "league_id and asset_id required" }, { status: 400 });

  const { data: member } = await supabase
    .from("league_members")
    .select("role")
    .eq("league_id", league_id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!member || member.role !== "admin") return NextResponse.json({ error: "Only commissioner can override pick." }, { status: 403 });

  const { data: state } = await supabaseAdmin.from("draft_state").select("*").eq("league_id", league_id).maybeSingle();
  if (!state) return NextResponse.json({ error: "Draft state not found." }, { status: 404 });
  if (state.status !== "paused") return NextResponse.json({ error: "Pause the draft before override picking." }, { status: 409 });

  const { data: order } = await supabaseAdmin.from("draft_order").select("*").eq("league_id", league_id).order("slot", { ascending: true });
  if (!order?.length) return NextResponse.json({ error: "Draft order missing." }, { status: 500 });

  const teamCount = order.length;
  const pickNumber = state.current_pick + 1;
  const maxPick = totalPicks(teamCount, state.rounds);
  if (pickNumber > maxPick) return NextResponse.json({ error: "Draft already complete." }, { status: 409 });

  const { round, slot } = snakeSlotForPick({ pickNumber, teamCount });
  const slotRow = order.find((r: any) => r.slot === slot);
  if (!slotRow) return NextResponse.json({ error: "Slot not found." }, { status: 500 });

  // Validate asset is allowed by pool and not already drafted
  const { data: pool } = await supabaseAdmin.from("league_assets").select("asset_id").eq("league_id", league_id);
  const poolIds = (pool ?? []).map((r: any) => r.asset_id);
  if (poolIds.length > 0 && !poolIds.includes(asset_id)) return NextResponse.json({ error: "Asset not in league pool." }, { status: 400 });

  const { data: drafted } = await supabaseAdmin.from("draft_picks").select("asset_id").eq("league_id", league_id);
  const draftedSet = new Set((drafted ?? []).map((r: any) => r.asset_id).filter(Boolean));
  if (draftedSet.has(asset_id)) return NextResponse.json({ error: "Asset already drafted." }, { status: 400 });

  await supabaseAdmin.from("draft_picks").insert({
    league_id, pick_number: pickNumber, round, slot,
    user_id: slotRow.user_id, asset_id, source: "commissioner"
  });
  await supabaseAdmin.from("rosters").insert({ league_id, user_id: slotRow.user_id, asset_id });

  await supabaseAdmin.from("glosimar_insights").insert({
    league_id,
    user_id: slotRow.user_id,
    event_type: "roster_change",
    headline: "Commissioner roster update",
    body: "Commissioner made a roster change. Review your risk mix and consider how this affects your matchup strategy."
  });

  await supabaseAdmin.from("draft_state").update({
    current_pick: state.current_pick + 1,
    updated_at: new Date().toISOString()
  }).eq("league_id", league_id);

  return NextResponse.json({ ok: true, pick_number: pickNumber, user_id: slotRow.user_id, asset_id });
}
