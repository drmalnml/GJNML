import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/adminClient";
import { computeLeagueWeek, ensureScheduleIfMissing } from "@/lib/league/scoring";
import { leagueWeek } from "@/lib/league/week";

/**
 * Weekly automation (MVP):
 * - Ensures schedule exists for active leagues (round-robin)
 * - Computes scoreboard for the current "week" (simple counter)
 *
 * For now, we map "week" to ISO week-of-year to keep it deterministic without a league start date.
 * Later: add league.start_date and compute relative weeks.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const { data: leagues, error: lErr } = await supabaseAdmin.from("leagues").select("id,status,started_at").eq("status", "active");
  if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 });

  let processed = 0;
  const results: any[] = [];

  for (const lg of leagues ?? []) {

      // Ensure IXIC (NASDAQ Composite) is always included in the league asset pool
      await supabaseAdmin
        .from("league_asset_pool")
        .upsert({ league_id: lg.id, asset_id: "IXIC" }, { onConflict: "league_id,asset_id" });

    const wk = leagueWeek((lg as any).started_at, now);

    try {
      const sch = await ensureScheduleIfMissing(lg.id);
      const scored = await computeLeagueWeek(lg.id, wk);

      // Matchup insights (MVP)
      const { data: matchups } = await supabaseAdmin
        .from("league_schedule")
        .select("home_user_id, away_user_id")
        .eq("league_id", lg.id)
        .eq("week", wk);

      if (matchups && matchups.length > 0) {
        const { data: scores } = await supabaseAdmin
          .from("league_scores")
          .select("user_id, points")
          .eq("league_id", lg.id)
          .eq("week", wk);

        const pMap = new Map((scores ?? []).map((s: any) => [s.user_id, Number(s.points)]));

        for (const m of matchups as any[]) {
          const hp = pMap.get(m.home_user_id) ?? 0;
          const ap = pMap.get(m.away_user_id) ?? 0;

          await supabaseAdmin.from("glosimar_insights").insert({
            league_id: lg.id,
            user_id: m.home_user_id,
            week: wk,
            event_type: "matchup",
            headline: "Matchup update",
            body: hp === ap
              ? `Week ${wk} is currently tied (${hp.toFixed(2)} vs ${ap.toFixed(2)}). Diversify to reduce volatility.`
              : (hp > ap
                  ? `Week ${wk}: You are leading (${hp.toFixed(2)} vs ${ap.toFixed(2)}). Protect the lead by avoiding concentrated risk.`
                  : `Week ${wk}: You are trailing (${hp.toFixed(2)} vs ${ap.toFixed(2)}). Balance risk buckets and asset kinds to stabilize points.`)
          });

          await supabaseAdmin.from("glosimar_insights").insert({
            league_id: lg.id,
            user_id: m.away_user_id,
            week: wk,
            event_type: "matchup",
            headline: "Matchup update",
            body: hp === ap
              ? `Week ${wk} is currently tied (${ap.toFixed(2)} vs ${hp.toFixed(2)}). Diversify to reduce volatility.`
              : (ap > hp
                  ? `Week ${wk}: You are leading (${ap.toFixed(2)} vs ${hp.toFixed(2)}). Protect the lead by avoiding concentrated risk.`
                  : `Week ${wk}: You are trailing (${ap.toFixed(2)} vs ${hp.toFixed(2)}). Balance risk buckets and asset kinds to stabilize points.`)
          });
        }
      }

      processed += 1;
      results.push({ league_id: lg.id, schedule_created: sch.created, scored_users: scored.users });
    } catch (e: any) {
      results.push({ league_id: lg.id, error: e?.message ?? "error" });
    }
  }

  return NextResponse.json({ ok: true, processed, results });
}
