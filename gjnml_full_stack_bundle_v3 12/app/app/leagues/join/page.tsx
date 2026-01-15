'use client';
import { useState } from "react";
import AppHeader from "@/components/AppHeader";

export default function JoinLeaguePage() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function join() {
    setStatus(null);
    const res = await fetch("/api/leagues/join", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ invite_code: code })
    });
    const data = await res.json();
    if (!res.ok) { setStatus(data?.error ?? "Could not join league."); return; }
    window.location.href = `/app/leagues/${data.league_id}`;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "white" }}>
      <AppHeader subtitle="Join a League" />
      <main style={{ padding: 24, maxWidth: 520 }}>
        <h1>Join a League</h1>
        <p style={{ color:"rgba(255,255,255,0.75)" }}>Enter the league invite code (example: GJNML-AB12CD34).</p>
        <div style={{ display:"grid", gap:10, marginTop:14 }}>
          <input value={code} onChange={(e)=>setCode(e.target.value)} style={{ padding:12, borderRadius:12, border:"1px solid rgba(255,255,255,0.2)", background:"rgba(0,0,0,0.35)", color:"white" }} />
          <button onClick={join} style={{ padding:12, borderRadius:12, border:"none", cursor:"pointer" }}>
            Join
          </button>
          {status && <div style={{ color:"#ff6b6b" }}>{status}</div>}
        </div>
      </main>
    </div>
  );
}
