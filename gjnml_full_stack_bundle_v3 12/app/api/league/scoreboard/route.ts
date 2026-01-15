import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase/routeClient";
import { supabaseAdmin } from "@/lib/supabase/adminClient";
import { leagueWeek } from "@/lib/league/week";

export async function GET(req: Request) {
  const supabase = supabaseRoute();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const league_id = searchParams.get("league_id");
  const weekParam = searchParams.get("week");
  if (!league_id) return NextResponse.json({ error: "league_id required" }, { status: 400 });

  const { data: league } = await supabaseAdmin.from("leagues").select("started_at").eq("id", league_id).maybeSingle();
  const current = leagueWeek((league as any)?.started_at, new Date());
  const week = weekParam ? Number(weekParam) : current;

  // membership check
  const { data: member } = await supabase
    .from("league_members")
    .select("role")
    .eq("league_id", league_id)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "Not a member." }, { status: 403 });

  const { data: scores, error: sErr } = await supabaseAdmin
    .from("league_scores")
    .select("user_id, roster_value, points")
    .eq("league_id", league_id)
    .eq("week", week);

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  const { data: profiles } = await supabaseAdmin.from("profiles").select("id, full_name, email");

  const nameMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name ?? p.email ?? p.id]));
  const rows = (scores ?? []).map((s: any) => ({
    user_id: s.user_id,
    name: nameMap.get(s.user_id) ?? s.user_id,
    roster_value: Number(s.roster_value),
    points: Number(s.points)
  })).sort((a,b) => b.points - a.points);

  // week matchups
  const { data: matchups } = await supabaseAdmin
    .from("league_schedule")
    .select("home_user_id, away_user_id")
    .eq("league_id", league_id)
    // Matchups not strictly mapped to ISO week in MVP.
 // placeholder
  // We can't easily map ISO week to schedule week in MVP; leave matchups optional.
  return NextResponse.json({ ok: true, week, rows });
}
