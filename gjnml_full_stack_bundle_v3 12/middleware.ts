import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const inviteOnly = (process.env.INVITE_ONLY_MODE ?? "true") === "true";
  if (!inviteOnly) return NextResponse.next();

  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data } = await supabase.auth.getSession();
  const session = data.session;

  if (req.nextUrl.pathname.startsWith("/app")) {
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/auth";
      url.searchParams.set("next", req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    const userId = session.user.id;

    const { data: redemption } = await supabase
      .from("invite_redemptions")
      .select("invite_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    const { data: membership } = await supabase
      .from("league_members")
      .select("league_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    const allowed = Boolean(redemption?.invite_id) || Boolean(membership?.league_id);

    if (!allowed) {
      const url = req.nextUrl.clone();
      url.pathname = "/invite";
      url.searchParams.set("next", req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = { matcher: ["/app/:path*"] };
