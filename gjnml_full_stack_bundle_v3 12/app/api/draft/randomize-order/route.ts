import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase/routeClient";
import { supabaseAdmin } from "@/lib/supabase/adminClient";

function shuffle<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function POST(req: Request) {
  const supabase = supabaseRoute();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json();
  const league_id = String(body.league_id ?? "");
  if (!league_id) return NextResponse.json({ error: "league_id required" }, { status: 400 });

  const { data: member } = await supabase
    .from("league_members")
    .select("role")
    .eq("league_id", league_id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!member) return NextResponse.json({ error: "Not a league member." }, { status: 403 });
  if (member.role !== "admin") return NextResponse.json({ error: "Only the commissioner/admin can randomize order." }, { status: 403 });

  const { data: state } = await supabaseAdmin.from("draft_state").select("*").eq("league_id", league_id).maybeSingle();
  if (state && state.status !== "not_started") {
    return NextResponse.json({ error: "Cannot randomize after draft has started." }, { status: 409 });
  }

  const { data: members, error: memErr } = await supabaseAdmin
    .from("league_members")
    .select("user_id, joined_at")
    .eq("league_id", league_id)
    .order("joined_at", { ascending: true });

  if (memErr || !members?.length) return NextResponse.json({ error: "No members found." }, { status: 500 });

  const shuffled = shuffle(members);
  const orderRows = shuffled.map((m: any, idx: number) => ({ league_id, slot: idx + 1, user_id: m.user_id }));

  const { error: oErr } = await supabaseAdmin.from("draft_order").upsert(orderRows, { onConflict: "league_id,slot" });
  if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });

  return NextResponse.json({ status: "ok", slots: orderRows.length });
}
