"use client";

import { useEffect, useState } from "react";

export default function ScoreboardPage({ params }: { params: { leagueId: string } }) {
  const [rows, setRows] = useState<any[]>([]);
  const [week, setWeek] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [insights, setInsights] = useState<any[]>([]);

  async function load() {
    // scoreboard

    setErr(null);
    const res = await fetch(`/api/league/scoreboard?league_id=${params.leagueId}`);
    const json = await res.json();
    if (!res.ok) { setErr(json?.error ?? "Could not load"); return; }
    setRows(json.rows ?? []);
    // insights
    const ir = await fetch(`/api/league/insights?league_id=${params.leagueId}`);
    const ij = await ir.json();
    if (ir.ok) setInsights(ij.insights ?? []);
    setWeek(json.week ?? null);
  }

  useEffect(() => { load(); }, [params.leagueId]);

  return (
    <div style={{ padding: 22, color: "white", maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>Scoreboard</h1>
      <div style={{ opacity: 0.8, marginBottom: 14 }}>Week: {week ?? "—"} • Roster Value = Points (MVP)</div>

      {err && <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,0,0,0.15)", border: "1px solid rgba(255,0,0,0.25)" }}>{err}</div>}

      <div style={{ border: "1px solid rgba(255,255,255,0.18)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 180px 180px", padding: "10px 12px", background: "rgba(255,255,255,0.06)", fontWeight: 700 }}>
          <div>#</div>
          <div>Team</div>
          <div>Roster Value</div>
          <div>Points</div>
        </div>
        {rows.map((r, i) => (
          <div key={r.user_id} style={{ display: "grid", gridTemplateColumns: "60px 1fr 180px 180px", padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.12)" }}>
            <div>{i + 1}</div>
            <div style={{ fontWeight: 600 }}>{r.name}</div>
            <div>${Number(r.roster_value).toFixed(2)}</div>
            <div>{Number(r.points).toFixed(2)}</div>
          </div>
        ))}
        {!rows.length && (
          <div style={{ padding: 14, opacity: 0.8 }}>No scores yet. (Weekly cron generates them for active leagues.)</div>
        )}
      </div>

      
      <div style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>GLOSIMAR Insights</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {insights.map((x) => (
            <div key={x.id} style={{ border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 12 }}>
              <div style={{ fontWeight: 800 }}>{x.headline}</div>
              <div style={{ opacity: 0.8, fontSize: 12, marginTop: 2 }}>{x.event_type} • {new Date(x.created_at).toLocaleString()}</div>
              <div style={{ marginTop: 8, lineHeight: 1.35 }}>{x.body}</div>
            </div>
          ))}
          {!insights.length && <div style={{ opacity: 0.8 }}>No insights yet. Draft picks and roster updates generate them.</div>}
        </div>
      </div>

<div style={{ marginTop: 14, opacity: 0.8, fontSize: 13 }}>
        Tip: Market prices are currently a fake feed (random walk). Replace later with real data providers.
      </div>
    </div>
  );
}
