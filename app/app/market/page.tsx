"use client";

import { useEffect, useMemo, useState } from "react";

type PriceRow = { asset_id: string; price: number; as_of: string; kind?: string; name?: string };

export default function MarketPage() {
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    const res = await fetch("/api/market/latest");
    const json = await res.json();
    if (!res.ok) { setErr(json?.error ?? "Failed to load market."); return; }
    setRows(json.rows ?? []);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, []);

  const ixic = useMemo(() => rows.find(r => r.asset_id === "IXIC"), [rows]);

  return (
    <div style={{ padding: 22, color: "white", maxWidth: 1040, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>Market</h1>
      <div style={{ opacity: 0.8, marginBottom: 14 }}>
        Live crypto via Kraken (if enabled). Equities/ETFs/indexes via fake NASDAQ feed until real providers are plugged in.
      </div>

      {err && <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,0,0,0.15)", border: "1px solid rgba(255,0,0,0.25)" }}>{err}</div>}

      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ border: "1px solid rgba(255,255,255,0.18)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.06)", fontWeight: 800 }}>NASDAQ Composite (IXIC)</div>
          <div style={{ padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{ixic ? ixic.price.toFixed(2) : "—"}</div>
            <div style={{ opacity: 0.75, fontSize: 13 }}>{ixic ? new Date(ixic.as_of).toLocaleString() : ""}</div>
          </div>
          <div style={{ padding: "0 12px 12px", opacity: 0.8, fontSize: 13 }}>
            This synthetic index is useful as a reference line for league valuation and “market day” context.
          </div>
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,0.18)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.06)", fontWeight: 800 }}>Latest Prices</div>
          {(rows ?? []).map((r) => (
            <div key={r.asset_id} style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.12)", display: "grid", gridTemplateColumns: "100px 1fr 140px", gap: 10 }}>
              <div style={{ fontWeight: 800 }}>{r.asset_id}</div>
              <div style={{ opacity: 0.9 }}>{r.name ?? ""}</div>
              <div style={{ textAlign: "right", fontWeight: 700 }}>{Number(r.price).toFixed(4)}</div>
            </div>
          ))}
          {!rows?.length && <div style={{ padding: 14, opacity: 0.8 }}>No market rows yet.</div>}
        </div>
      </div>
    </div>
  );
}
