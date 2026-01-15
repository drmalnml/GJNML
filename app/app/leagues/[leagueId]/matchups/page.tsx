"use client";

import { useEffect, useState } from "react";

export default function MatchupsPage({ params }: { params: { leagueId: string } }) {
  const [week, setWeek] = useState<number | null>(null);
  const [matchups, setMatchups] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    const mRes = await fetch(`/api/league/matchups?league_id=${params.leagueId}`);
    const mJson = await mRes.json();
    if (!mRes.ok) { setErr(mJson?.error ?? "Could not load matchups"); return; }
    setWeek(mJson.week ?? null);
    setMatchups(mJson.rows ?? []);

    const sRes = await fetch(`/api/league/standings?league_id=${params.leagueId}`);
    const sJson = await sRes.json();
    if (sRes.ok) setStandings(sJson.rows ?? []);
  }

  useEffect(() => { load(); }, [params.leagueId]);

  return (
    <div style={{ padding: 22, color: "white", maxWidth: 1040, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>Weekly Matchups</h1>
      <div style={{ opacity: 0.8, marginBottom: 14 }}>League Week: {week ?? "—"}</div>

      {err && <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,0,0,0.15)", border: "1px solid rgba(255,0,0,0.25)" }}>{err}</div>}

      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ border: "1px solid rgba(255,255,255,0.18)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.06)", fontWeight: 800 }}>Matchups</div>

          {(matchups ?? []).map((m, i) => {
            const hw = m.winner_user_id === m.home_user_id;
            const aw = m.winner_user_id === m.away_user_id;
            const tied = m.winner_user_id === null;

            return (
              <div key={i} style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.12)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 70px 120px 1fr", gap: 10, alignItems: "center" }}>
                  <div style={{ fontWeight: 700, opacity: hw || tied ? 1 : 0.85 }}>{m.home_name}</div>
                  <div style={{ textAlign: "right", fontWeight: hw ? 900 : 600 }}>{Number(m.home_points).toFixed(2)}</div>
                  <div style={{ textAlign: "center", opacity: 0.75 }}>vs</div>
                  <div style={{ textAlign: "left", fontWeight: aw ? 900 : 600 }}>{Number(m.away_points).toFixed(2)}</div>
                  <div style={{ textAlign: "right", fontWeight: 700, opacity: aw || tied ? 1 : 0.85 }}>{m.away_name}</div>
                </div>
                {tied && <div style={{ marginTop: 6, opacity: 0.8, fontSize: 13 }}>Tied game (so far).</div>}
              </div>
            );
          })}

          {!matchups?.length && <div style={{ padding: 14, opacity: 0.8 }}>No matchups scheduled for this week yet.</div>}
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,0.18)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.06)", fontWeight: 800 }}>Standings</div>

          <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 90px 90px 90px 140px", padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.12)", fontWeight: 700 }}>
            <div>#</div>
            <div>Team</div>
            <div>W</div>
            <div>L</div>
            <div>T</div>
            <div>Points For</div>
          </div>

          {(standings ?? []).map((r, i) => (
            <div key={r.user_id} style={{ display: "grid", gridTemplateColumns: "60px 1fr 90px 90px 90px 140px", padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.12)" }}>
              <div>{i + 1}</div>
              <div style={{ fontWeight: 700 }}>{r.name}</div>
              <div>{r.wins}</div>
              <div>{r.losses}</div>
              <div>{r.ties}</div>
              <div>{Number(r.points_for).toFixed(2)}</div>
            </div>
          ))}

          {!standings?.length && <div style={{ padding: 14, opacity: 0.8 }}>No standings yet.</div>}
        </div>

        <div style={{ opacity: 0.8, fontSize: 13 }}>
          Market prices are currently a fake feed (random walk). Real feeds plug in later without changing matchup math.
        </div>
      </div>
    </div>
  );
}
