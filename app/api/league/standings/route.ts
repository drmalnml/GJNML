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
  if (!league_id) return NextResponse.json({ error: "league_id required" }, { status: 400 });

  const { data: member } = await supabase
    .from("league_members")
    .select("role")
    .eq("league_id", league_id)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "Not a member." }, { status: 403 });

  const { data: league } = await supabaseAdmin.from("leagues").select("started_at").eq("id", league_id).maybeSingle();
  const currentWeek = leagueWeek((league as any)?.started_at, new Date());

  const { data: schedule, error: schErr } = await supabaseAdmin
    .from("league_schedule")
    .select("week, home_user_id, away_user_id")
    .eq("league_id", league_id)
    .lte("week", currentWeek);
  if (schErr) return NextResponse.json({ error: schErr.message }, { status: 500 });

  const { data: scores, error: sErr } = await supabaseAdmin
    .from("league_scores")
    .select("week, user_id, points")
    .eq("league_id", league_id)
    .lte("week", currentWeek);
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  const points = new Map<string, number>();
  for (const s of scores ?? []) {
    points.set(`${(s as any).week}:${(s as any).user_id}`, Number((s as any).points));
  }

  const wins = new Map<string, number>();
  const losses = new Map<string, number>();
  const ties = new Map<string, number>();
  const pf = new Map<string, number>();

  const inc = (m: Map<string, number>, k: string, v = 1) => m.set(k, (m.get(k) ?? 0) + v);

  for (const m of schedule ?? []) {
    const week = (m as any).week as number;
    const h = (m as any).home_user_id as string;
    const a = (m as any).away_user_id as string;
    const hp = points.get(`${week}:${h}`) ?? 0;
    const ap = points.get(`${week}:${a}`) ?? 0;

    inc(pf, h, hp); inc(pf, a, ap);

    if (hp === ap) { inc(ties, h); inc(ties, a); }
    else if (hp > ap) { inc(wins, h); inc(losses, a); }
    else { inc(wins, a); inc(losses, h); }
  }

  const { data: members } = await supabaseAdmin.from("league_members").select("user_id").eq("league_id", league_id);
  const userIds = (members ?? []).map((m: any) => m.user_id);

  const { data: profiles } = await supabaseAdmin.from("profiles").select("id, full_name, email");
  const nameMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name ?? p.email ?? p.id]));

  const rows = userIds.map((id: string) => ({
    user_id: id,
    name: nameMap.get(id) ?? id,
    wins: wins.get(id) ?? 0,
    losses: losses.get(id) ?? 0,
    ties: ties.get(id) ?? 0,
    points_for: Number((pf.get(id) ?? 0).toFixed(2))
  })).sort((x, y) => (y.wins - x.wins) || (y.points_for - x.points_for));

  return NextResponse.json({ ok: true, week: currentWeek, rows });
}
