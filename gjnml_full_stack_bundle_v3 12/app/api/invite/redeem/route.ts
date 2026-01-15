import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase/routeClient";
import { supabaseAdmin } from "@/lib/supabase/adminClient";

export async function POST(req: Request) {
  const { code } = await req.json();
  if (!code || typeof code !== "string") return NextResponse.json({ error: "Missing invite code." }, { status: 400 });

  const supabase = supabaseRoute();
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const user = authData.user;

  const { data: invite, error: invErr } = await supabaseAdmin.from("invites").select("*").eq("code", code).single();
  if (invErr || !invite) return NextResponse.json({ error: "Invalid invite code." }, { status: 400 });

  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Invite code expired." }, { status: 400 });
  }
  if (invite.uses >= invite.max_uses) return NextResponse.json({ error: "Invite code already used." }, { status: 400 });

  if (invite.issued_to_email && invite.issued_to_email.toLowerCase() !== (user.email ?? "").toLowerCase()) {
    return NextResponse.json({ error: "This invite is assigned to a different email." }, { status: 403 });
  }

  const { error: redErr } = await supabaseAdmin.from("invite_redemptions").upsert({ invite_id: invite.id, user_id: user.id });
  if (redErr) return NextResponse.json({ error: "Could not redeem invite." }, { status: 500 });

  const { error: updErr } = await supabaseAdmin.from("invites").update({ uses: invite.uses + 1 }).eq("id", invite.id);
  if (updErr) return NextResponse.json({ error: "Redeemed, but could not update invite usage." }, { status: 500 });

  return NextResponse.json({ status: "ok" });
}
