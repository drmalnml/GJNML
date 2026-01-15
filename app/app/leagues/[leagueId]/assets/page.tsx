'use client';

import { useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";

type Asset = { id: string; name: string; kind: string; active: boolean };

export default function LeagueAssetsPage({ params }: { params: { leagueId: string } }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<string | null>(null);

  async function load() {
    setStatus(null);
    const res = await fetch(`/api/assets/pool?league_id=${params.leagueId}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) { setStatus(json?.error ?? "Failed to load assets."); return; }
    setAssets(json.assets);
    const sel: Record<string, boolean> = {};
    for (const a of json.assets) sel[a.id] = Boolean(json.selected?.includes(a.id));
    setSelected(sel);
  }

  useEffect(() => { load(); }, [params.leagueId]);

  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);

  async function save() {
    setStatus(null);
    const chosen = Object.entries(selected).filter(([_, v]) => v).map(([k]) => k);
    const res = await fetch(`/api/assets/pool/set`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ league_id: params.leagueId, asset_ids: chosen })
    });
    const json = await res.json();
    if (!res.ok) { setStatus(json?.error ?? "Failed to save."); return; }
    setStatus("Saved.");
    await load();
  }

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "white" }}>
      <AppHeader subtitle="Commissioner: Asset Pool" />
      <main style={{ padding: 24, maxWidth: 920 }}>
        <h1>League Asset Pool</h1>
        <p style={{ color:"rgba(255,255,255,0.75)" }}>
          Select which assets are eligible for this league’s draft and gameplay. If you select none, the league defaults to all active assets.
        </p>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap: 12, flexWrap:"wrap", marginTop: 14 }}>
          <div style={{ color:"rgba(255,255,255,0.75)" }}>Selected: <strong>{selectedCount}</strong></div>
          <button onClick={save} style={{ padding:"10px 14px", borderRadius: 12, border:"none", cursor:"pointer" }}>Save Pool</button>
        </div>

        {status && <p style={{ color: status === "Saved." ? "rgba(145,255,145,0.9)" : "#ff6b6b" }}>{status}</p>}

        <div style={{ display:"grid", gap: 10, marginTop: 12 }}>
          {assets.map((a) => (
            <label key={a.id} style={{
              display:"flex",
              alignItems:"center",
              justifyContent:"space-between",
              gap: 12,
              padding: 12,
              borderRadius: 16,
              border:"1px solid rgba(255,255,255,0.12)",
              background:"rgba(255,255,255,0.03)"
            }}>
              <div>
                <strong>{a.id}</strong> <span style={{ color:"rgba(255,255,255,0.75)" }}>{a.name}</span>
                <div style={{ fontSize: 12, color:"rgba(255,255,255,0.6)" }}>{a.kind}</div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(selected[a.id])}
                onChange={(e) => setSelected((s) => ({ ...s, [a.id]: e.target.checked }))}
              />
            </label>
          ))}
        </div>
      </main>
    </div>
  );
}
