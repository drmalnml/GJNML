/**
 * OPTIONAL always-on worker (non-Vercel).
 * Run on any server (Render/Fly/EC2) to enforce drafts even when nobody is watching.
 *
 * Usage:
 *   CRON_SECRET=... NEXT_PUBLIC_BASE_URL=https://yourapp.com node worker/draft-enforcer.ts
 */
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
if (!baseUrl) throw new Error("NEXT_PUBLIC_BASE_URL is required (e.g., https://yourapp.com)");

const secret = process.env.CRON_SECRET;

async function ping() {
  const res = await fetch(`${baseUrl}/api/cron/draft-enforcer`, {
    method: "GET",
    headers: secret ? { "x-cron-secret": secret } : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) console.error("Draft enforcer error:", res.status, json);
  else console.log("Draft enforcer:", json);
}

setInterval(ping, 60_000);
ping();
