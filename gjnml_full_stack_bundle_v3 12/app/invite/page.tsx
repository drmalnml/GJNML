'use client';
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browserClient";

export default function InvitePage() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const supabase = supabaseBrowser();

  async function redeem() {
    setStatus(null);
    const { data } = await supabase.auth.getSession();
    if (!data.session) { window.location.href = "/auth"; return; }

    const res = await fetch("/api/invite/redeem", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code })
    });
    const json = await res.json();
    if (!res.ok) { setStatus(json?.error ?? "Invite redemption failed."); return; }
    window.location.href = "/app";
  }

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "white" }}>
      <main style={{ padding: 24, maxWidth: 520 }}>
        <h1>Enter invite code</h1>
        <p style={{ color: "rgba(255,255,255,0.75)" }}>Early access is invite-only. Sign in, then enter your invite code.</p>
        <div style={{ display: "grid", gap: 10 }}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g., GJNML-AB12CD34"
            style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.35)", color: "white" }}
          />
          <button onClick={redeem} style={{ padding: 12, borderRadius: 12, border: "none", cursor: "pointer" }}>
            Redeem
          </button>
          {status && <div style={{ color: "#ff6b6b" }}>{status}</div>}
        </div>
      </main>
    </div>
  );
}
