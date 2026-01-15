import Link from "next/link";
import AppHeader from "@/components/AppHeader";

export default function LeagueHub({ params }: { params: { leagueId: string } }) {
  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "white" }}>
      <AppHeader subtitle="League Hub" />
      <main style={{ padding: 24, maxWidth: 920 }}>
        <h1>League</h1>
        <p style={{ color:"rgba(255,255,255,0.75)" }}>League ID: <code>{params.leagueId}</code></p>

        <div style={{ display:"flex", gap:12, marginTop: 12, flexWrap:"wrap" }}>
          <Link href={`/app/leagues/${params.leagueId}/assets`} style={{ color:"white" }}>Assets (Commissioner)</Link>
          <Link href={`/app/leagues/${params.leagueId}/draft`} style={{ color:"white" }}>Draft</Link>
          <Link href={`/app/leagues/${params.leagueId}/team`} style={{ color:"white" }}>My Team</Link>
        </div>

        <p style={{ marginTop: 18, color:"rgba(255,255,255,0.75)" }}>
          New: Commissioner can set an asset pool per league. Draft picks are enforced against the pool.
        </p>
      </main>
    </div>
  );
}
