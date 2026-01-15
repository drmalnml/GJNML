"use client";

import { useState } from "react";

export function GlosimarInsightCard(props: {
  headline?: string;
  bullets?: string[];
  footer?: string;
}) {
  const [open, setOpen] = useState(false);

  const headline = props.headline ?? "GLOSIMAR Insight";
  const bullets = props.bullets ?? [
    "Diversify across risk buckets (low/medium/high) before doubling down.",
    "Mix asset kinds early (equity/ETF/crypto/index) to avoid one-note rosters.",
    "Auto-pick prioritizes underrepresented buckets for balance."
  ];
  const footer = props.footer ?? "Commissioner can pause/resume the draft if the room needs a reset.";

  return (
    <div style={{
      border: "1px solid rgba(255,255,255,0.18)",
      background: "rgba(255,255,255,0.04)",
      borderRadius: 16,
      padding: 14
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 800 }}>{headline}</div>
          <div style={{ opacity: 0.8, fontSize: 13 }}>Draft coaching: balance beats panic.</div>
        </div>
        <button
          onClick={() => setOpen(!open)}
          style={{ padding: "8px 12px", borderRadius: 12, border:"1px solid rgba(255,255,255,0.25)", background:"transparent", color:"white", cursor:"pointer" }}
        >
          {open ? "Collapse" : "Expand"}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {bullets.map((b, i) => <li key={i} style={{ lineHeight: 1.35 }}>{b}</li>)}
          </ul>
          <div style={{ opacity: 0.75, fontSize: 12 }}>{footer}</div>
        </div>
      )}
    </div>
  );
}
