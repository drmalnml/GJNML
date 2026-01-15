import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase/routeClient";

export async function GET() {
  const supabase = supabaseRoute();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data, error } = await supabase
    .from("league_members")
    .select("league_id, leagues:leagues(*)")
    .eq("user_id", auth.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const leagues = (data ?? []).map((row: any) => row.leagues).filter(Boolean);
  return NextResponse.json({ leagues });
}
