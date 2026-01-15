# GJNML Invite-only MVP v2 — Auth + Leagues + Draft (Realtime + Timer Enforcement) + Asset Pool Controls

This bundle adds:
1) **Draft time enforcement** (timer + auto-pick / skip) via `/api/draft/tick`
2) **Commissioner-controlled asset pool per league** via `/app/leagues/[leagueId]/assets`

## Key idea (MVP-friendly)
There is no always-on background worker in this starter pack.
Instead:
- Any client on the live draft page calls `/api/draft/tick` every second.
- The server enforces deadlines and will auto-pick (or skip) when a timer expires.
- With multiple users in the draft, this becomes effectively "real-time enforced".

For production, you would replace this with a server worker (cron/queue).

## Install
```bash
npm i @supabase/supabase-js @supabase/auth-helpers-nextjs
```

## Env vars (.env.local)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...     # server only
INVITE_ONLY_MODE=true
NEXT_PUBLIC_BASE_URL=http://localhost:3000

## Supabase SQL setup (run in order)
1) db/schema_core.sql
2) db/schema_invites.sql
3) db/schema_leagues_extras.sql
4) db/schema_draft.sql
5) db/schema_assets_pool.sql
6) db/rls_policies.sql
7) db/rls_leagues_policies.sql
8) db/rls_draft.sql
9) db/rls_assets_pool.sql

## Enable Realtime (Supabase Dashboard)
Add tables to realtime publication:
- draft_state
- draft_picks
(optional) draft_order

## Routes
- /auth
- /invite
- /app
- /app/leagues/new
- /app/leagues/join
- /app/leagues/[leagueId]
- /app/leagues/[leagueId]/assets   (commissioner asset pool)
- /app/leagues/[leagueId]/draft
- /app/leagues/[leagueId]/draft/live
- /app/leagues/[leagueId]/team


## Always-on drafts (runs even when nobody is watching)
Two ways:

### A) Vercel Cron (if deployed on Vercel)
This repo includes `vercel.json` which schedules `GET /api/cron/draft-enforcer` every 1 minute.

Optional security:
- Set `CRON_SECRET` and require header `x-cron-secret` to match.
- If you don't want this, remove the secret check inside `app/api/cron/draft-enforcer/route.ts`.

### B) Always-on worker (any host)
Run `worker/draft-enforcer.ts` on a small server. It pings the cron endpoint every minute.

## Auto-pick strategy (diversify)
Auto-picks now use:
- `assets.risk_bucket` (low/medium/high)
- `assets.kind` (equity/etf/crypto/index)
The strategy fills underrepresented buckets first and respects the league asset pool.

## Commissioner: Randomize Draft Order
Before the draft starts, the commissioner can randomize order:
- `POST /api/draft/randomize-order` (admin only)
Button added on Live Draft: **Randomize Order (Admin)**


### Vercel Cron Authentication
This build validates `Authorization: Bearer $CRON_SECRET`, which Vercel Cron sends automatically when the env var is configured.


## Commissioner Controls (Draft Ops)
New endpoints:
- POST /api/draft/pause  (admin only)  -> sets status=paused and clears deadline
- POST /api/draft/resume (admin only)  -> sets status=live and resets deadline
- POST /api/draft/settings (admin only, before start or paused) -> update pick_seconds / rounds
- POST /api/draft/override-pick (admin only, paused) -> manual pick for current slot

UI (Live Draft):
- Pause Draft (Admin)
- Resume Draft (Admin)
- Expandable GLOSIMAR Insight card (placeholder coaching copy)


## Schedule + Scoreboard + Market Stub (MVP)
- Fake market feed updates `asset_prices` via cron: `/api/cron/market-tick` every minute.
- Weekly cron `/api/cron/weekly` ensures schedule exists for active leagues and computes league_scores (Points = Roster Value).
- Scoreboard UI: `/app/leagues/[leagueId]/scoreboard`
- Commissioner can generate schedule manually: `POST /api/league/schedule/generate`
- GLOSIMAR insights are written to `glosimar_insights` on roster changes (draft picks / overrides) and displayed on the scoreboard.


## Matchups + Standings (v6)
- Page: `/app/leagues/[leagueId]/matchups`
- APIs:
  - GET `/api/league/matchups?league_id=...` (uses league-relative week)
  - GET `/api/league/standings?league_id=...` (W/L/T + points-for through current week)
- Weekly cron now computes scores using league-relative week derived from `leagues.started_at`.
- Weekly cron writes matchup insights into `glosimar_insights` with event_type='matchup'.


## Market Provider Adapters (v7)
The market tick now calls a provider interface so you can swap feeds without changing valuation/scoring logic.

### Default (Dev): Fake feed
- `MARKET_PROVIDER=fake` (default)
- Uses a bounded random-walk to update `asset_prices`

### Real feed slots (stubs included)
- `MARKET_PROVIDER=polygon`
- `MARKET_PROVIDER=iex`
- `MARKET_PROVIDER=kraken`

Adapters live in:
- `lib/market/providers/*`
- Registry: `lib/market/provider.ts`

To go live, implement `getLatestPrices()` for your chosen provider and add API keys in env.


### Kraken (LIVE crypto)
- Set `MARKET_PROVIDER=kraken`
- Uses Kraken public `/0/public/Ticker` to fetch last trade prices for crypto assets (USD pairs)
- Non-crypto assets continue to use the fake feed (so valuations/scoreboards still work)


### Optional: Set Kraken pair mappings (recommended)
Add exact Kraken pair codes in `assets.kraken_pair` to avoid symbol ambiguity.
Examples:
- BTC -> `XXBTZUSD`
- ETH -> `XETHZUSD`
- SOL -> `SOLUSD`
- DOGE -> `XDGUSD` (varies; verify in Kraken UI or API)

You can update in Supabase SQL editor, e.g.:
```sql
update assets set kraken_pair='XXBTZUSD' where id='BTC';
update assets set kraken_pair='XETHZUSD' where id='ETH';
```


## Commissioner Asset Pool Editor (v10)
- Page: `/app/leagues/[leagueId]/commissioner/assets`
- API:
  - GET `/api/league/assets?league_id=...`
  - PATCH `/api/league/assets` (commissioner/admin only)
    - Toggle pool membership via `in_pool`
    - Set crypto `kraken_pair` mapping via `kraken_pair`


## Fake NASDAQ feed (for equities/ETFs/indexes)
Until you wire Polygon/IEX, you can make the fake feed feel like a NASDAQ tape (correlated moves):
- Set `FAKE_EQUITY_MODEL=nasdaq`
- Optional tuning:
  - `FAKE_NASDAQ_FACTOR_VOL` (default 0.0025)
  - `FAKE_DRIFT_BPS` (default 0.5 bps per tick)

This works seamlessly with `MARKET_PROVIDER=kraken` because non-crypto assets already fall back to the fake provider.


## Synthetic NASDAQ index (IXIC)
- A default `assets` row for `IXIC` (NASDAQ Composite) is added to the seed insert.
- Market page: `/app/market` shows the IXIC reference line and latest prices.
- This stays fake until you wire Polygon/IEX, but provides a stable “market context” asset for testers.


## IXIC auto-inclusion
- The NASDAQ Composite index (`IXIC`) is automatically added to every league’s asset pool:
  - On league creation
  - Re-asserted during weekly cron as a safety net
- Commissioners can still remove it manually if desired (but it will reappear on next cron run).


### IXIC auto-included in new leagues
When a league is created, the server automatically inserts `IXIC` into `league_asset_pool` so every league has a market reference line by default.
In the Commissioner Asset Pool editor, `IXIC` is locked and cannot be removed.
