import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase/routeClient";
import { supabaseAdmin } from "@/lib/supabase/adminClient";

export async function POST(req: Request) {
  const supabase = supabaseRoute();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json();
  const invite_code = String(body.invite_code ?? "").trim().toUpperCase();
  if (!invite_code) return NextResponse.json({ error: "Invite code required." }, { status: 400 });

  const { data: league, error: lErr } = await supabaseAdmin
    .from("leagues")
    .select("*")
    .eq("invite_code", invite_code)
    .single();

  if (lErr || !league) return NextResponse.json({ error: "League not found for that code." }, { status: 404 });

  const { count, error: cErr } = await supabaseAdmin
    .from("league_members")
    .select("*", { count: "exact", head: true })
    .eq("league_id", league.id);

  if (cErr) return NextResponse.json({ error: "Could not verify league capacity." }, { status: 500 });
  if ((count ?? 0) >= league.max_members) return NextResponse.json({ error: "League is full." }, { status: 409 });

  const { error: jErr } = await supabaseAdmin
    .from("league_members")
    .upsert({ league_id: league.id, user_id: auth.user.id, role: "member" });

  if (jErr) return NextResponse.json({ error: "Could not join league." }, { status: 500 });

  return NextResponse.json({ status: "joined", league_id: league.id });
}
