import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase/routeClient";
import { supabaseAdmin } from "@/lib/supabase/adminClient";
import { roundRobinSchedule } from "@/lib/league/schedule";

export async function POST(req: Request) {
  const supabase = supabaseRoute();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { league_id, weeks } = await req.json();
  if (!league_id) return NextResponse.json({ error: "league_id required" }, { status: 400 });

  // commissioner only
  const { data: member } = await supabase
    .from("league_members")
    .select("role")
    .eq("league_id", league_id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!member || member.role !== "admin") return NextResponse.json({ error: "Only commissioner can generate schedule." }, { status: 403 });

  const { data: members } = await supabaseAdmin
    .from("league_members")
    .select("user_id, joined_at")
    .eq("league_id", league_id)
    .order("joined_at", { ascending: true });

  const userIds = (members ?? []).map((m: any) => m.user_id);
  if (userIds.length < 2) return NextResponse.json({ error: "Need at least 2 members." }, { status: 400 });

  const rr = roundRobinSchedule(userIds);
  const maxWeeks = typeof weeks === "number" ? Math.min(Math.max(1, weeks), rr.length) : rr.length;
  const rows: any[] = [];

  for (let w = 1; w <= maxWeeks; w++) {
    for (const p of rr[w - 1]) {
      rows.push({ league_id, week: w, home_user_id: p.home, away_user_id: p.away });
    }
  }

  const { error: upErr } = await supabaseAdmin.from("league_schedule").upsert(rows, { onConflict: "league_id,week,home_user_id,away_user_id" });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, weeks: maxWeeks, matchups: rows.length });
}
