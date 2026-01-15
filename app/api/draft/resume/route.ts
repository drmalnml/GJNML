import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase/routeClient";
import { supabaseAdmin } from "@/lib/supabase/adminClient";

export async function POST(req: Request) {
  const supabase = supabaseRoute();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { league_id } = await req.json();
  if (!league_id) return NextResponse.json({ error: "league_id required" }, { status: 400 });

  const { data: member } = await supabase
    .from("league_members")
    .select("role")
    .eq("league_id", league_id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!member || member.role !== "admin") return NextResponse.json({ error: "Only commissioner can resume." }, { status: 403 });

  const { data: state } = await supabaseAdmin.from("draft_state").select("*").eq("league_id", league_id).maybeSingle();
  if (!state) return NextResponse.json({ error: "Draft state not found." }, { status: 404 });

  const now = Date.now();
  const deadline = new Date(now + (state.pick_seconds ?? 30) * 1000).toISOString();

  await supabaseAdmin
    .from("draft_state")
    .update({ status: "live", pick_deadline_at: deadline, updated_at: new Date().toISOString() })
    .eq("league_id", league_id);

  return NextResponse.json({ ok: true, status: "live", pick_deadline_at: deadline });
}
