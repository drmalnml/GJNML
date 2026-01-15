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

  const { data: member } = await supabase
    .from("league_members")
    .select("role")
    .eq("league_id", league_id)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "Not a member." }, { status: 403 });

  const { data: league } = await supabaseAdmin.from("leagues").select("started_at").eq("id", league_id).maybeSingle();
  const current = leagueWeek((league as any)?.started_at, new Date());
  const week = weekParam ? Number(weekParam) : current;

  const { data: schedule, error: schErr } = await supabaseAdmin
    .from("league_schedule")
    .select("home_user_id, away_user_id")
    .eq("league_id", league_id)
    .eq("week", week);
  if (schErr) return NextResponse.json({ error: schErr.message }, { status: 500 });

  const { data: scores, error: sErr } = await supabaseAdmin
    .from("league_scores")
    .select("user_id, points")
    .eq("league_id", league_id)
    .eq("week", week);
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  const pMap = new Map((scores ?? []).map((s: any) => [s.user_id, Number(s.points)]));
  const { data: profiles } = await supabaseAdmin.from("profiles").select("id, full_name, email");
  const nameMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name ?? p.email ?? p.id]));

  const rows = (schedule ?? []).map((m: any) => {
    const hp = pMap.get(m.home_user_id) ?? 0;
    const ap = pMap.get(m.away_user_id) ?? 0;
    const winner = hp === ap ? null : (hp > ap ? m.home_user_id : m.away_user_id);
    return {
      home_user_id: m.home_user_id,
      home_name: nameMap.get(m.home_user_id) ?? m.home_user_id,
      home_points: hp,
      away_user_id: m.away_user_id,
      away_name: nameMap.get(m.away_user_id) ?? m.away_user_id,
      away_points: ap,
      winner_user_id: winner,
    };
  });

  return NextResponse.json({ ok: true, week, rows });
}
