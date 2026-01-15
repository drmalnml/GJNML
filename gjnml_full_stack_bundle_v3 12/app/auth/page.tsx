'use client';
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browserClient";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const supabase = supabaseBrowser();

  async function sendLink() {
    setMsg(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/invite` }
    });
    if (error) setMsg(error.message);
    else setMsg("Check your email for the sign-in link.");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "white" }}>
      <main style={{ padding: 24, maxWidth: 520 }}>
        <h1>Sign in</h1>
        <p style={{ color: "rgba(255,255,255,0.75)" }}>We’ll email you a sign-in link.</p>
        <div style={{ display: "grid", gap: 10 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.35)", color: "white" }}
          />
          <button onClick={sendLink} style={{ padding: 12, borderRadius: 12, border: "none", cursor: "pointer" }}>
            Send magic link
          </button>
          {msg && <div style={{ color: "rgba(255,255,255,0.75)" }}>{msg}</div>}
        </div>
      </main>
    </div>
  );
}
