import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase/routeClient";
import { supabaseAdmin } from "@/lib/supabase/adminClient";

export async function POST(req: Request) {
  const supabase = supabaseRoute();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const type = String(body.type ?? "private");
  const mode = String(body.mode ?? "learn");
  const max_members = Number(body.max_members ?? 12);

  if (!name) return NextResponse.json({ error: "League name required." }, { status: 400 });
  if (!["public","private","market"].includes(type)) return NextResponse.json({ error: "Invalid league type." }, { status: 400 });
  if (!["learn","compete"].includes(mode)) return NextResponse.json({ error: "Invalid league mode." }, { status: 400 });
  if (!Number.isFinite(max_members) || max_members < 2 || max_members > 50) {
    return NextResponse.json({ error: "max_members must be between 2 and 50." }, { status: 400 });
  }

  const { data: league, error: lErr } = await supabaseAdmin
    .from("leagues")
    .insert({ name, type, mode, max_members, created_by: auth.user.id, status: "forming" })
    .select("*")
    .single();

  if (lErr || !league) return NextResponse.json({ error: lErr?.message ?? "Could not create league." }, { status: 500 });

  const { error: mErr } = await supabaseAdmin
    .from("league_members")
    .insert({ league_id: league.id, user_id: auth.user.id, role: "admin" });

  if (mErr) return NextResponse.json({ error: "League created, but could not add membership." }, { status: 500 });

  // Auto-include the synthetic NASDAQ index (IXIC) in every league pool for market context
  await supabaseAdmin.from("league_asset_pool").insert({ league_id: league.id, asset_id: "IXIC" });

  return NextResponse.json({ league });
}
