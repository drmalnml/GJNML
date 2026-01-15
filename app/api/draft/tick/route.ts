import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase/routeClient";
import { supabaseAdmin } from "@/lib/supabase/adminClient";
import { snakeSlotForPick, totalPicks } from "@/lib/draft/engine";
import { selectAutoPickAsset } from "@/lib/draft/autoPick";

// Auto-pick uses a diversification strategy (risk bucket + kind) and respects league pool.

export async function POST(req: Request) {
  const supabase = supabaseRoute();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json();
  const league_id = String(body.league_id ?? "");
  if (!league_id) return NextResponse.json({ error: "league_id required" }, { status: 400 });

  // must be league member to tick
  const { data: member } = await supabase.from("league_members").select("user_id").eq("league_id", league_id).eq("user_id", auth.user.id).maybeSingle();
  if (!member) return NextResponse.json({ error: "Not a league member." }, { status: 403 });

  const { data: state } = await supabaseAdmin.from("draft_state").select("*").eq("league_id", league_id).single();
  const { data: order } = await supabaseAdmin.from("draft_order").select("*").eq("league_id", league_id).order("slot", { ascending: true });
  if (!state || !order?.length) return NextResponse.json({ status: "noop" });

  const now = Date.now();

  // countdown -> live
  if (state.status === "countdown" && state.starts_at) {
    if (new Date(state.starts_at).getTime() <= now) {
      const deadline = new Date(now + state.pick_seconds * 1000).toISOString();
      await supabaseAdmin.from("draft_state").update({ status: "live", pick_deadline_at: deadline, updated_at: new Date().toISOString() }).eq("league_id", league_id);
      return NextResponse.json({ status: "started" });
    }
    return NextResponse.json({ status: "counting_down" });
  }

  if (state.status !== "live") return NextResponse.json({ status: "noop" });

  // If no deadline set, set it (safety)
  if (!state.pick_deadline_at) {
    const deadline = new Date(now + state.pick_seconds * 1000).toISOString();
    await supabaseAdmin.from("draft_state").update({ pick_deadline_at: deadline, updated_at: new Date().toISOString() }).eq("league_id", league_id);
    return NextResponse.json({ status: "deadline_set" });
  }

  // if deadline not reached, noop
  if (new Date(state.pick_deadline_at).getTime() > now) {
    return NextResponse.json({ status: "waiting" });
  }

  const teamCount = order.length;
  const currentPickNumber = state.current_pick + 1;
  const maxPick = totalPicks(teamCount, state.rounds);
  if (currentPickNumber > maxPick) {
    await supabaseAdmin.from("draft_state").update({ status: "completed", pick_deadline_at: null }).eq("league_id", league_id);
    await supabaseAdmin.from("leagues").update({ status: "active", started_at: new Date().toISOString() }).eq("id", league_id);
    return NextResponse.json({ status: "completed" });
  }

  const { round, slot } = snakeSlotForPick({ pickNumber: currentPickNumber, teamCount });
  const slotRow = order.find((r: any) => r.slot === slot);
  if (!slotRow) return NextResponse.json({ error: "Draft order missing slot." }, { status: 500 });

  // auto-pick strategy; if none, skip
  const choice = await selectAutoPickAsset({ league_id, user_id: slotRow.user_id });
  const asset_id = choice?.asset_id ?? null;
  if (asset_id) {
    await supabaseAdmin.from("draft_picks").insert({
      league_id,
      pick_number: currentPickNumber,
      round,
      slot,
      user_id: slotRow.user_id,
      asset_id,
      source: "auto"
    });
    await supabaseAdmin.from("rosters").insert({ league_id, user_id: slotRow.user_id, asset_id });

    await supabaseAdmin.from("glosimar_insights").insert({
      league_id,
      user_id: slotRow.user_id,
      event_type: "roster_change",
      headline: "GLOSIMAR Insight: Roster updated",
      body: "A new asset was added. Consider balancing risk buckets (low/medium/high) and mixing asset kinds for more durable learning."
    });
  } else {
    await supabaseAdmin.from("draft_picks").insert({
      league_id,
      pick_number: currentPickNumber,
      round,
      slot,
      user_id: slotRow.user_id,
      asset_id: null,
      source: "skip"
    });
  }

  const nextPick = state.current_pick + 1;
  const nextStatus = nextPick >= maxPick ? "completed" : "live";
  const nextDeadline = nextStatus === "live" ? new Date(now + state.pick_seconds * 1000).toISOString() : null;

  await supabaseAdmin.from("draft_state").update({
    current_pick: nextPick,
    status: nextStatus,
    pick_deadline_at: nextDeadline,
    updated_at: new Date().toISOString()
  }).eq("league_id", league_id);

  if (nextStatus === "completed") await supabaseAdmin.from("leagues").update({ status: "active", started_at: new Date().toISOString() }).eq("id", league_id);
  return NextResponse.json({ status: asset_id ? "auto_picked" : "skipped", asset_id: asset_id ?? null, pick_number: currentPickNumber });
}
