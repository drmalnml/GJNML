import Link from "next/link";
import AppHeader from "@/components/AppHeader";

async function getState(leagueId: string) {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const res = await fetch(`${base}/api/draft/state?league_id=${leagueId}`, { cache: "no-store" });
  if (!res.ok) return { state: null, order: [], picks: [], error: true };
  return res.json();
}

export default async function DraftHub({ params }: { params: { leagueId: string } }) {
  const data = await getState(params.leagueId);
  const state = data.state;

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "white" }}>
      <AppHeader subtitle="Draft" />
      <main style={{ padding: 24, maxWidth: 920 }}>
        <h1>Draft</h1>
        {!state ? (
          <p>No draft scheduled. A league admin can start it.</p>
        ) : (
          <div style={{ display:"grid", gap:10 }}>
            <div>Draft status: <strong>{state.status}</strong></div>
            {state.status === "countdown" && <div>Starts at: <strong>{state.starts_at}</strong></div>}
            <div>Rounds: <strong>{state.rounds}</strong> • Pick timer: <strong>{state.pick_seconds}s</strong></div>
            <div>Current pick index: <strong>{state.current_pick}</strong></div>
            {state.pick_deadline_at && <div>Pick deadline: <strong>{state.pick_deadline_at}</strong></div>}
          </div>
        )}

        <div style={{ display:"flex", gap:12, marginTop: 16, flexWrap:"wrap" }}>
          <Link href={`/app/leagues/${params.leagueId}/draft/live`} style={{ color:"white" }}>Enter Live Draft</Link>
          <Link href={`/app/leagues/${params.leagueId}`} style={{ color:"white" }}>Back to League</Link>
        </div>
      </main>
    </div>
  );
}
