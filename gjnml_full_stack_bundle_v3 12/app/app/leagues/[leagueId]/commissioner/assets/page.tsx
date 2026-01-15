"use client";

import { useEffect, useMemo, useState } from "react";

type Row = {
  id: string;
  name: string | null;
  kind: string;
  risk_bucket: string | null;
  kraken_pair: string | null;
  in_pool: boolean;
};

export default function CommissionerAssetsPage({ params }: { params: { leagueId: string } }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setErr(null);
    setMsg(null);
    const res = await fetch(`/api/league/assets?league_id=${params.leagueId}`);
    const json = await res.json();
    if (!res.ok) { setErr(json?.error ?? "Failed to load assets."); return; }
    setRows(json.rows ?? []);
  }

  useEffect(() => { load(); }, [params.leagueId]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r =>
      r.id.toLowerCase().includes(s) ||
      (r.name ?? "").toLowerCase().includes(s) ||
      (r.kind ?? "").toLowerCase().includes(s) ||
      (r.kraken_pair ?? "").toLowerCase().includes(s)
    );
  }, [rows, q]);

  async function patch(asset_id: string, payload: any) {
    setSaving(prev => ({ ...prev, [asset_id]: true }));
    setErr(null);
    setMsg(null);

    const res = await fetch("/api/league/assets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ league_id: params.leagueId, asset_id, ...payload }),
    });
    const json = await res.json();
    if (!res.ok) {
      setErr(json?.error ?? "Update failed.");
    } else {
      setMsg("Saved.");
    }
    setSaving(prev => ({ ...prev, [asset_id]: false }));
  }

  function setLocal(asset_id: string, patchObj: Partial<Row>) {
    setRows(prev => prev.map(r => r.id === asset_id ? ({ ...r, ...patchObj }) : r));
  }

  return (
    <div style={{ padding: 22, color: "white", maxWidth: 1180, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>Commissioner: Asset Pool</h1>
      <div style={{ opacity: 0.85, marginBottom: 16 }}>
        Control which assets can be drafted in this league, and optionally set exact Kraken pair codes for crypto.
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search ticker / name / kind / kraken pair"
          style={{ flex: "1 1 420px", padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.25)", background: "rgba(0,0,0,0.25)", color: "white" }}
        />
        <button
          onClick={load}
          style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.06)", color: "white", cursor: "pointer" }}
        >
          Refresh
        </button>
      </div>

      {err && (
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,0,0,0.15)", border: "1px solid rgba(255,0,0,0.25)", marginBottom: 12 }}>
          {err}
        </div>
      )}
      {msg && (
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(0,255,120,0.12)", border: "1px solid rgba(0,255,120,0.22)", marginBottom: 12 }}>
          {msg}
        </div>
      )}

      <div style={{ border: "1px solid rgba(255,255,255,0.18)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "90px 1.2fr 120px 120px 220px 120px", gap: 10, padding: "10px 12px", background: "rgba(255,255,255,0.06)", fontWeight: 800 }}>
          <div>Ticker</div>
          <div>Name</div>
          <div>Kind</div>
          <div>Risk</div>
          <div>Kraken Pair</div>
          <div>In Pool</div>
        </div>

        {(filtered ?? []).map((r) => (
          <div key={r.id} style={{ display: "grid", gridTemplateColumns: "90px 1.2fr 120px 120px 220px 120px", gap: 10, padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.12)", alignItems: "center" }}>
            <div style={{ fontWeight: 800 }}>{r.id}</div>
            <div style={{ opacity: 0.95 }}>{r.name ?? "—"}</div>
            <div style={{ opacity: 0.9 }}>{r.kind}</div>
            <div style={{ opacity: 0.9 }}>{r.risk_bucket ?? "—"}</div>

            <div>
              <input
                value={r.kraken_pair ?? ""}
                onChange={(e) => setLocal(r.id, { kraken_pair: e.target.value })}
                placeholder={r.kind === "crypto" ? "e.g. XXBTZUSD" : "n/a"}
                disabled={r.kind !== "crypto"}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.22)",
                  background: r.kind === "crypto" ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.06)",
                  color: "white",
                  opacity: r.kind === "crypto" ? 1 : 0.55
                }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => patch(r.id, { kraken_pair: (r.kraken_pair ?? "").trim() || null })}
                  disabled={saving[r.id] || r.kind !== "crypto"}
                  style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.06)", color: "white", cursor: "pointer", opacity: saving[r.id] ? 0.6 : 1 }}
                >
                  Save Pair
                </button>
                {r.kind === "crypto" && (
                  <button
                    onClick={() => { setLocal(r.id, { kraken_pair: "" }); patch(r.id, { kraken_pair: null }); }}
                    disabled={saving[r.id]}
                    style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.20)", background: "rgba(255,255,255,0.03)", color: "white", cursor: "pointer", opacity: saving[r.id] ? 0.6 : 0.9 }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div>
              <label style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={r.in_pool}
                  disabled={r.id === "IXIC"}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setLocal(r.id, { in_pool: next });
                    patch(r.id, { in_pool: next });
                  }}
                />
                <span style={{ opacity: 0.9 }}>{r.id === "IXIC" ? "Locked" : (r.in_pool ? "Yes" : "No")}</span>
              </label>
            </div>
          </div>
        ))}

        {!filtered.length && <div style={{ padding: 14, opacity: 0.8 }}>No assets match your search.</div>}
      </div>

      <div style={{ marginTop: 14, opacity: 0.8, fontSize: 13 }}>
        Tip: For Kraken, pair codes can be the “long” Kraken format (e.g., XXBTZUSD) or short (e.g., SOLUSD). If a pair is missing, the system soft-falls back to fake prices.
      </div>
    </div>
  );
}
