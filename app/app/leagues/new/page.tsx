'use client';
import { useState } from "react";
import AppHeader from "@/components/AppHeader";

export default function CreateLeaguePage() {
  const [name, setName] = useState("");
  const [type, setType] = useState<"public"|"private"|"market">("private");
  const [mode, setMode] = useState<"learn"|"compete">("learn");
  const [maxMembers, setMaxMembers] = useState(12);
  const [status, setStatus] = useState<string | null>(null);

  async function create() {
    setStatus(null);
    const res = await fetch("/api/leagues/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, type, mode, max_members: maxMembers })
    });
    const data = await res.json();
    if (!res.ok) { setStatus(data?.error ?? "Could not create league."); return; }
    window.location.href = `/app/leagues/${data.league.id}`;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "white" }}>
      <AppHeader subtitle="Create a League" />
      <main style={{ padding: 24, maxWidth: 620 }}>
        <h1>Create League</h1>
        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          <label>
            League name
            <input value={name} onChange={(e)=>setName(e.target.value)} style={{ width:"100%", padding:12, borderRadius:12, border:"1px solid rgba(255,255,255,0.2)", background:"rgba(0,0,0,0.35)", color:"white" }} />
          </label>

          <label>
            Type
            <select value={type} onChange={(e)=>setType(e.target.value as any)} style={{ width:"100%", padding:12, borderRadius:12 }}>
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="market">Market</option>
            </select>
          </label>

          <label>
            Mode
            <select value={mode} onChange={(e)=>setMode(e.target.value as any)} style={{ width:"100%", padding:12, borderRadius:12 }}>
              <option value="learn">Learn</option>
              <option value="compete">Compete</option>
            </select>
          </label>

          <label>
            Max members
            <input type="number" value={maxMembers} onChange={(e)=>setMaxMembers(Number(e.target.value))} style={{ width:"100%", padding:12, borderRadius:12, border:"1px solid rgba(255,255,255,0.2)", background:"rgba(0,0,0,0.35)", color:"white" }} />
          </label>

          <button onClick={create} style={{ padding: 12, borderRadius: 12, border: "none", cursor: "pointer" }}>
            Create
          </button>
          {status && <div style={{ color: "#ff6b6b" }}>{status}</div>}
        </div>
      </main>
    </div>
  );
}
