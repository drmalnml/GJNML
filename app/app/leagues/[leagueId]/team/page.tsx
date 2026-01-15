import Link from "next/link";
import AppHeader from "@/components/AppHeader";

async function getRoster(leagueId: string) {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const res = await fetch(`${base}/api/team?league_id=${leagueId}`, { cache: "no-store" });
  if (!res.ok) return { roster: [], error: true };
  return res.json();
}

export default async function TeamPage({ params }: { params: { leagueId: string } }) {
  const data = await getRoster(params.leagueId);
  const roster = data.roster ?? [];

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "white" }}>
      <AppHeader subtitle="My Team" />
      <main style={{ padding: 24, maxWidth: 920 }}>
        <h1>My Team</h1>
        <p style={{ color:"rgba(255,255,255,0.75)" }}>Drafted assets in this league.</p>

        {data.error && <p style={{ color:"#ff6b6b" }}>Could not load roster.</p>}

        <div style={{ display:"grid", gap: 10, marginTop: 14 }}>
          {roster.length === 0 ? (
            <p>No assets yet. Draft to build your team.</p>
          ) : (
            roster.map((r: any) => (
              <div key={r.asset_id} style={{ padding: 12, borderRadius: 16, border:"1px solid rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.03)" }}>
                <strong>{r.asset_id}</strong> <span style={{ color:"rgba(255,255,255,0.75)" }}>({r.assets?.name ?? ""})</span>
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <Link href={`/app/leagues/${params.leagueId}`} style={{ color:"white" }}>Back to League</Link>
        </div>
      </main>
    </div>
  );
}
