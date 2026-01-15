import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase/routeClient";
import { supabaseAdmin } from "@/lib/supabase/adminClient";

export async function POST(req: Request) {
  const supabase = supabaseRoute();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json();
  const league_id = String(body.league_id);
  const rounds = Number(body.rounds ?? 6);
  const pick_seconds = Number(body.pick_seconds ?? 60);
  const countdown_seconds = Number(body.countdown_seconds ?? 15);

  const { data: member } = await supabase
    .from("league_members")
    .select("role")
    .eq("league_id", league_id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!member) return NextResponse.json({ error: "Not a league member." }, { status: 403 });
  if (member.role !== "admin") return NextResponse.json({ error: "Only league admins can start the draft." }, { status: 403 });

  const { data: members, error: memErr } = await supabaseAdmin
    .from("league_members")
    .select("user_id, joined_at")
    .eq("league_id", league_id)
    .order("joined_at", { ascending: true });

  if (memErr || !members?.length) return NextResponse.json({ error: "No members found." }, { status: 500 });

  const orderRows = members.map((m: any, idx: number) => ({ league_id, slot: idx + 1, user_id: m.user_id }));
  const { error: oErr } = await supabaseAdmin.from("draft_order").upsert(orderRows, { onConflict: "league_id,slot" });
  if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });

  const starts_at = countdown_seconds > 0 ? new Date(Date.now() + countdown_seconds * 1000) : null;
  const status = countdown_seconds > 0 ? "countdown" : "live";
  const nowIso = new Date().toISOString();

  const deadline_at = status === "live"
    ? new Date(Date.now() + pick_seconds * 1000).toISOString()
    : null;

  const { error: sErr } = await supabaseAdmin.from("draft_state").upsert({
    league_id,
    status,
    rounds,
    pick_seconds,
    starts_at: starts_at ? starts_at.toISOString() : null,
    current_pick: 0,
    pick_deadline_at: deadline_at,
    updated_at: nowIso
  });
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  await supabaseAdmin.from("leagues").update({ status: "drafting", draft_start_at: starts_at ? starts_at.toISOString() : nowIso }).eq("id", league_id);
  return NextResponse.json({ status: "ok", starts_at: starts_at?.toISOString() ?? null, team_count: members.length });
}
