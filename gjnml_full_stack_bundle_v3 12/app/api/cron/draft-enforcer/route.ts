import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/adminClient";
import { snakeSlotForPick, totalPicks } from "@/lib/draft/engine";
import { selectAutoPickAsset } from "@/lib/draft/autoPick";

/**
 * Always-on draft enforcement.
 * If hosted on Vercel, `vercel.json` can schedule this route every minute.
 *
 * Optional auth:
 *  - Set CRON_SECRET and send header x-cron-secret with the same value.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }


  const { data: states, error: sErr } = await supabaseAdmin
    .from("draft_state")
    .select("*")
    .in("status", ["countdown", "live"]);

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  if (!states?.length) return NextResponse.json({ status: "ok", processed: 0 });

  const now = Date.now();
  let processed = 0;
  const results: any[] = [];

  for (const state of states) {
    if (state.status === "paused") continue;

    const league_id = state.league_id as string;

    const { data: order } = await supabaseAdmin
      .from("draft_order")
      .select("*")
      .eq("league_id", league_id)
      .order("slot", { ascending: true });

    if (!order?.length) continue;

    // countdown -> live
    if (state.status === "countdown" && state.starts_at) {
      if (new Date(state.starts_at).getTime() <= now) {
        const deadline = new Date(now + state.pick_seconds * 1000).toISOString();
        await supabaseAdmin
          .from("draft_state")
          .update({ status: "live", pick_deadline_at: deadline, updated_at: new Date().toISOString() })
          .eq("league_id", league_id);
        processed += 1;
        results.push({ league_id, action: "started" });
      }
      continue;
    }

    if (state.status !== "live") continue;

    // Ensure a deadline exists
    if (!state.pick_deadline_at) {
      const deadline = new Date(now + state.pick_seconds * 1000).toISOString();
      await supabaseAdmin
        .from("draft_state")
        .update({ pick_deadline_at: deadline, updated_at: new Date().toISOString() })
        .eq("league_id", league_id);
      processed += 1;
      results.push({ league_id, action: "deadline_set" });
      continue;
    }

    // If deadline not reached, no-op
    if (new Date(state.pick_deadline_at).getTime() > now) continue;

    const teamCount = order.length;
    const currentPickNumber = state.current_pick + 1;
    const maxPick = totalPicks(teamCount, state.rounds);
    if (currentPickNumber > maxPick) {
      await supabaseAdmin.from("draft_state").update({ status: "completed", pick_deadline_at: null }).eq("league_id", league_id);
      await supabaseAdmin.from("leagues").update({ status: "active", started_at: new Date().toISOString() }).eq("id", league_id);
      processed += 1;
      results.push({ league_id, action: "completed" });
      continue;
    }

    const { round, slot } = snakeSlotForPick({ pickNumber: currentPickNumber, teamCount });
    const slotRow = order.find((r: any) => r.slot === slot);
    if (!slotRow) continue;

    const chosen = await selectAutoPickAsset({ league_id, user_id: slotRow.user_id });
    if (chosen?.asset_id) {
      await supabaseAdmin.from("draft_picks").insert({
        league_id, pick_number: currentPickNumber, round, slot,
        user_id: slotRow.user_id, asset_id: chosen.asset_id, source: "auto"
      });
      await supabaseAdmin.from("rosters").insert({ league_id, user_id: slotRow.user_id, asset_id: chosen.asset_id });

      await supabaseAdmin.from("glosimar_insights").insert({
        league_id,
        user_id: slotRow.user_id,
        event_type: "roster_change",
        headline: "GLOSIMAR Insight: Diversify your roster",
        body: "Auto-pick added an asset aligned to your underrepresented risk/kind buckets. Over time, balanced rosters tend to learn faster and swing less."
      });
    } else {
      await supabaseAdmin.from("draft_picks").insert({
        league_id, pick_number: currentPickNumber, round, slot,
        user_id: slotRow.user_id, asset_id: null, source: "skip"
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

    processed += 1;
    results.push({ league_id, action: chosen?.asset_id ? "auto_picked" : "skipped", asset_id: chosen?.asset_id ?? null });
  }

  return NextResponse.json({ status: "ok", processed, results });
}
