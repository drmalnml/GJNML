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

  if (!member || member.role !== "admin") return NextResponse.json({ error: "Only commissioner can pause." }, { status: 403 });

  await supabaseAdmin
    .from("draft_state")
    .update({ status: "paused", pick_deadline_at: null, updated_at: new Date().toISOString() })
    .eq("league_id", league_id);

  return NextResponse.json({ ok: true, status: "paused" });
}
