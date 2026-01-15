import Link from "next/link";
import AppHeader from "@/components/AppHeader";

async function getMyLeagues() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const res = await fetch(`${base}/api/leagues/my`, { cache: "no-store" });
  if (!res.ok) return { leagues: [], error: true };
  return res.json();
}

export default async function MyLeaguesPage() {
  const data = await getMyLeagues();
  const leagues = data.leagues ?? [];

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "white" }}>
      <AppHeader subtitle="Invite-only MVP • Leagues" />
      <main style={{ padding: 24, maxWidth: 920 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h1 style={{ margin: 0 }}>My Leagues</h1>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/app/leagues/join" style={{ color: "white" }}>Join</Link>
            <Link href="/app/leagues/new" style={{ color: "white" }}>Create</Link>
          </div>
        </div>

        {data.error && <p style={{ color: "#ff6b6b" }}>Could not load leagues. Check RLS policies.</p>}

        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          {leagues.length === 0 ? (
            <p>No leagues yet. Create one or join with a code.</p>
          ) : (
            leagues.map((l: any) => (
              <Link key={l.id} href={`/app/leagues/${l.id}`} style={{
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 16,
                padding: 14,
                textDecoration: "none",
                color: "white",
                background: "rgba(255,255,255,0.03)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <strong>{l.name}</strong>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
                    {l.type} • {l.mode} • {l.status}
                  </span>
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
                  Invite code: <strong>{l.invite_code ?? "—"}</strong>
                </div>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
