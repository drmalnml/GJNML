import { supabaseAdmin } from "@/lib/supabase/adminClient";

/**
 * MVP scoring:
 * - Roster value = sum(latest price for each drafted asset)
 * - Points = roster_value (simple, transparent)
 * Later: weekly returns, risk-adjusted scoring, streaks, etc.
 */
export async function computeLeagueWeek(league_id: string, week: number) {
  // Get all roster rows for league
  const { data: rosters, error: rErr } = await supabaseAdmin
    .from("rosters")
    .select("user_id, asset_id")
    .eq("league_id", league_id);

  if (rErr) throw new Error(rErr.message);

  const { data: prices, error: pErr } = await supabaseAdmin.from("asset_prices").select("asset_id, price");
  if (pErr) throw new Error(pErr.message);
  const priceMap = new Map((prices ?? []).map((r: any) => [r.asset_id, Number(r.price)]));

  const totals = new Map<string, number>();
  for (const row of rosters ?? []) {
    const uid = (row as any).user_id as string;
    const aid = (row as any).asset_id as string;
    const px = priceMap.get(aid) ?? 0;
    totals.set(uid, (totals.get(uid) ?? 0) + px);
  }

  const scoreRows = Array.from(totals.entries()).map(([user_id, roster_value]) => ({
    league_id,
    week,
    user_id,
    roster_value: Number(roster_value.toFixed(4)),
    points: Number(roster_value.toFixed(4)),
  }));

  const { error: sErr } = await supabaseAdmin.from("league_scores").upsert(scoreRows, { onConflict: "league_id,week,user_id" });
  if (sErr) throw new Error(sErr.message);

  return { users: scoreRows.length };
}

export async function ensureScheduleIfMissing(league_id: string) {
  const { data: existing } = await supabaseAdmin
    .from("league_schedule")
    .select("week")
    .eq("league_id", league_id)
    .limit(1);

  if (existing && existing.length > 0) return { created: false };

  const { data: members } = await supabaseAdmin
    .from("league_members")
    .select("user_id, joined_at")
    .eq("league_id", league_id)
    .order("joined_at", { ascending: true });

  const userIds = (members ?? []).map((m: any) => m.user_id);
  if (userIds.length < 2) return { created: false };

  // generate full round-robin
  const ids = userIds.slice();
  const isOdd = ids.length % 2 === 1;
  if (isOdd) ids.push("BYE");

  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;

  let arr = ids.slice();
  const rows: any[] = [];

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a !== "BYE" && b !== "BYE") {
        const even = r % 2 === 0;
        rows.push({ league_id, week: r + 1, home_user_id: even ? a : b, away_user_id: even ? b : a });
      }
    }
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop()!);
    arr = [fixed, ...rest];
  }

  const { error: upErr } = await supabaseAdmin.from("league_schedule").upsert(rows, { onConflict: "league_id,week,home_user_id,away_user_id" });
  if (upErr) throw new Error(upErr.message);

  return { created: true, weeks: rounds };
}
