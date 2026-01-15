'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import AppHeader from "@/components/AppHeader";
import { supabaseBrowser } from "@/lib/supabase/browserClient";

function Chip({ text }: { text: string }) {
  return (
    <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.18)", color:"rgba(255,255,255,0.9)" }}>
      {text}
    </span>
  );
}

export default function LiveDraft({ params }: { params: { leagueId: string } }) {
  const supabase = supabaseBrowser();
  const [data, setData] = useState<any>(null);
  const [available, setAvailable] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [asset, setAsset] = useState<string>("");
  const [starting, setStarting] = useState(false);
  const [picking, setPicking] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const pollRef = useRef<any>(null);
  const tickRef = useRef<any>(null);
  const countdownRef = useRef<any>(null);

  async function refresh() {
    const res = await fetch(`/api/draft/state?league_id=${params.leagueId}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) { setErr(json?.error ?? "Failed to load draft state"); return; }
    setData(json);
    setErr(null);
  }

  async function refreshAvailable() {
    const res = await fetch(`/api/assets/available?league_id=${params.leagueId}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) return;
    setAvailable(json.available ?? []);
    if (!asset && (json.available?.length ?? 0) > 0) setAsset(json.available[0].id);
  }

  async function tick() {
    // server enforces deadlines; any client can call it safely
    await fetch("/api/draft/tick", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ league_id: params.leagueId })
    });
  }

  // Initial load
  useEffect(() => {
    refresh();
    refreshAvailable();
  }, [params.leagueId]);

  // Realtime subscription (with polling fallback)
  useEffect(() => {
    let subscribed = false;

    const channel = supabase
      .channel(`draft:${params.leagueId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "draft_state", filter: `league_id=eq.${params.leagueId}` }, () => {
        subscribed = true;
        refresh();
        refreshAvailable();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "draft_picks", filter: `league_id=eq.${params.leagueId}` }, () => {
        subscribed = true;
        refresh();
        refreshAvailable();
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          pollRef.current = setInterval(() => { refresh(); refreshAvailable(); }, 20000);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          pollRef.current = setInterval(() => { refresh(); refreshAvailable(); }, 2500);
        }
      });

    const fallbackTimer = setTimeout(() => {
      if (!subscribed && !pollRef.current) pollRef.current = setInterval(() => { refresh(); refreshAvailable(); }, 2500);
    }, 3000);

    return () => {
      clearTimeout(fallbackTimer);
      if (pollRef.current) clearInterval(pollRef.current);
      supabase.removeChannel(channel);
    };
  }, [params.leagueId]);

  // Draft tick loop (timer enforcement)
  useEffect(() => {
    if (!tickRef.current) {
      tickRef.current = setInterval(() => { tick(); }, 1000);
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); tickRef.current = null; };
  }, [params.leagueId]);

  const state = data?.state ?? null;
  const order = data?.order ?? [];
  const picks = data?.picks ?? [];
  const userId = data?.user_id;

  const teamCount = order.length || 0;
  const currentPickNumber = (state?.current_pick ?? 0) + 1;

  const currentSlot = useMemo(() => {
    if (!state || !teamCount) return null;
    const round = Math.floor((currentPickNumber - 1) / teamCount) + 1;
    const posInRound = (currentPickNumber - 1) % teamCount;
    const reverse = round % 2 === 0;
    const slot = reverse ? (teamCount - posInRound) : (posInRound + 1);
    return { round, slot };
  }, [state, teamCount, currentPickNumber]);

  const currentUser = currentSlot ? order.find((o: any) => o.slot === currentSlot.slot)?.user_id : null;
  const isMyTurn = Boolean(state && state.status === "live" && currentUser && userId && currentUser === userId);

  // UI timer (seconds left)
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      if (!state?.pick_deadline_at || state.status !== "live") { setSecondsLeft(null); return; }
      const ms = new Date(state.pick_deadline_at).getTime() - Date.now();
      setSecondsLeft(Math.max(0, Math.ceil(ms / 1000)));
    }, 250);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [state?.pick_deadline_at, state?.status]);

  async function startDraft() {
    setStarting(true);
    const res = await fetch("/api/draft/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ league_id: params.leagueId, rounds: 6, pick_seconds: 60, countdown_seconds: 15 })
    });
    const json = await res.json();
    setStarting(false);
    if (!res.ok) { setErr(json?.error ?? "Could not start draft"); return; }
    await refresh();
    await refreshAvailable();
  }

  async function makePick() {
    setPicking(true);
    const res = await fetch("/api/draft/pick", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ league_id: params.leagueId, asset_id: asset })
    });
    const json = await res.json();
    setPicking(false);
    if (!res.ok) { setErr(json?.error ?? "Pick failed"); return; }
    await refresh();
    await refreshAvailable();
  }

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "white" }}>
      <AppHeader subtitle="Live Draft" />
      <main style={{ padding: 24, maxWidth: 1100 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap: 12, flexWrap:"wrap" }}>
          <h1 style={{ margin: 0 }}>Live Draft</h1>
          <div style={{ display:"flex", gap: 10, alignItems:"center", flexWrap:"wrap" }}>
            <Image src="/brand/glosimar-logo.png" alt="GLOSIMAR" width={26} height={26} style={{ objectFit:"contain" }} />
            <Chip text={state?.status ?? "no state"} />
            {currentSlot && <Chip text={`Round ${currentSlot.round} • Pick ${currentPickNumber}`} />}
            {state?.status === "live" && secondsLeft !== null && <Chip text={`⏱ ${secondsLeft}s`} />}
            {isMyTurn ? <Chip text="My Turn" /> : <Chip text="Other Player's Turn" />}
          </div>
        </div>

        {err && <p style={{ color:"#ff6b6b" }}>{err}</p>}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 380px", gap: 16, marginTop: 14 }}>
          <section style={{ border:"1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 14, background:"rgba(255,255,255,0.03)" }}>
            <h2 style={{ marginTop: 0 }}>Available Assets</h2>

            <div style={{ display:"flex", gap: 10, alignItems:"center", flexWrap:"wrap", marginTop: 10 }}>
              <select value={asset} onChange={(e)=>setAsset(e.target.value)} style={{ padding: 10, borderRadius: 12, minWidth: 220 }}>
                {available.length === 0 ? <option value="">No assets available</option> : null}
                {available.map((a: any) => <option key={a.id} value={a.id}>{a.id} • {a.name}</option>)}
              </select>

              <button onClick={makePick} disabled={!isMyTurn || picking || !asset} style={{ padding: "10px 14px", borderRadius: 12, border:"none", cursor:"pointer" }}>
                {picking ? "Picking..." : "Submit Pick"}
              </button>

              <button onClick={startDraft} disabled={starting} style={{ padding: "10px 14px", borderRadius: 12, border:"1px solid rgba(255,255,255,0.25)", background:"transparent", color:"white", cursor:"pointer" }}>
                {starting ? "Starting..." : "Start Draft (Admin)"}
              </button>

              <button
                onClick={async () => {
                  setErr(null);
                  const res = await fetch("/api/draft/randomize-order", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ league_id: params.leagueId })
                  });
                  const json = await res.json();
                  if (!res.ok) { setErr(json?.error ?? "Could not randomize order"); return; }
                  await refresh();
                }}
                style={{ padding: "10px 14px", borderRadius: 12, border:"1px solid rgba(255,255,255,0.25)", background:"transparent", color:"white", cursor:"pointer" }}
              >
                Randomize Order (Admin)
              </button>

              <button
                onClick={async () => {
                  setErr(null);
                  const res = await fetch("/api/draft/pause", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ league_id: params.leagueId })
                  });
                  const json = await res.json();
                  if (!res.ok) { setErr(json?.error ?? "Could not pause"); return; }
                  await refresh();
                }}
                style={{ padding: "10px 14px", borderRadius: 12, border:"1px solid rgba(255,255,255,0.25)", background:"transparent", color:"white", cursor:"pointer" }}
              >
                Pause Draft (Admin)
              </button>

              <button
                onClick={async () => {
                  setErr(null);
                  const res = await fetch("/api/draft/resume", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ league_id: params.leagueId })
                  });
                  const json = await res.json();
                  if (!res.ok) { setErr(json?.error ?? "Could not resume"); return; }
                  await refresh();
                }}
                style={{ padding: "10px 14px", borderRadius: 12, border:"1px solid rgba(255,255,255,0.25)", background:"transparent", color:"white", cursor:"pointer" }}
              >
                Resume Draft (Admin)
              </button>

            </div>

            <p style={{ fontSize: 12, color:"rgba(255,255,255,0.65)", marginTop: 10 }}>
              Timer enforcement is server-side. If a user misses the deadline, the system auto-picks from the league pool (or skips if empty).
            </p>

            <h3 style={{ marginTop: 18 }}>Pick Log</h3>
            <div style={{ display:"grid", gap: 8 }}>
              {picks.length === 0 ? <p>No picks yet.</p> : picks.map((p: any) => (
                <div key={p.pick_number} style={{ padding: 10, borderRadius: 12, background:"rgba(0,0,0,0.35)" }}>
                  <strong>#{p.pick_number}</strong> • Round {p.round} • Slot {p.slot} • <strong>{p.asset_id ?? "SKIP"}</strong>
                  <span style={{ marginLeft: 8, fontSize: 12, color:"rgba(255,255,255,0.65)" }}>
                    ({p.source ?? "user"})
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section style={{ border:"1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 14, background:"rgba(255,255,255,0.03)" }}>
            <h2 style={{ marginTop: 0 }}>Draft Order Queue</h2>
            {order.length === 0 ? (
              <p>No order yet. Start the draft.</p>
            ) : (
              <ol style={{ paddingLeft: 18 }}>
                {order.map((o: any) => (
                  <li key={o.slot} style={{ marginBottom: 6 }}>
                    Slot {o.slot}: <code style={{ color:"rgba(255,255,255,0.85)" }}>{String(o.user_id).slice(0, 8)}</code>
                    {currentSlot?.slot === o.slot && <span style={{ marginLeft: 8 }}><Chip text="On deck" /></span>}
                  </li>
                ))}
              </ol>
            )}
            <p style={{ fontSize: 12, color:"rgba(255,255,255,0.65)" }}>
              MVP uses member join order. Later: randomize or commissioner sets order.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
