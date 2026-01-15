create table if not exists assets (
  id text primary key,
  name text not null,
  kind text not null check (kind in ('crypto','equity','etf','index')),
  risk_bucket text not null default 'medium' check (risk_bucket in ('low','medium','high')),
  active boolean not null default true
);

create table if not exists league_assets (
  league_id uuid references leagues(id) on delete cascade,
  asset_id text references assets(id) on delete restrict,
  primary key (league_id, asset_id)
);

create table if not exists draft_state (
  league_id uuid primary key references leagues(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','countdown','live','completed')),
  draft_type text not null default 'snake' check (draft_type in ('snake')),
  rounds int not null default 6 check (rounds between 1 and 30),
  pick_seconds int not null default 60 check (pick_seconds between 10 and 600),
  starts_at timestamptz,
  current_pick int not null default 0,
  pick_deadline_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists draft_order (
  league_id uuid references leagues(id) on delete cascade,
  slot int not null,
  user_id uuid not null,
  primary key (league_id, slot)
);

create table if not exists draft_picks (
  league_id uuid references leagues(id) on delete cascade,
  pick_number int not null,
  round int not null,
  slot int not null,
  user_id uuid not null,
  asset_id text references assets(id),
  source text not null default 'user' check (source in ('user','auto','skip')),
  picked_at timestamptz not null default now(),
  primary key (league_id, pick_number),
  unique (league_id, asset_id)
);

create table if not exists rosters (
  league_id uuid references leagues(id) on delete cascade,
  user_id uuid not null,
  asset_id text references assets(id),
  acquired_via text not null default 'draft' check (acquired_via in ('draft')),
  created_at timestamptz not null default now(),
  primary key (league_id, user_id, asset_id)
);

insert into assets (id, name, kind, risk_bucket) values
  ('BTC','Bitcoin','crypto','high'),
  ('ETH','Ethereum','crypto','high'),
  ('AAPL','Apple','equity','medium'),
  ('MSFT','Microsoft','equity','medium'),
  ('NVDA','NVIDIA','equity','high'),
  ('VOO','Vanguard S&P 500 ETF','etf','low')
on conflict (id) do nothing;

-- Draft status values used in code: not_started, countdown, live, paused, completed


-- =========================
-- Market data stub (fake feed first)
-- =========================
create table if not exists asset_prices (
  asset_id text not null references assets(id) on delete cascade,
  price numeric not null,
  as_of timestamptz not null default now(),
  primary key (asset_id)

  ,('IXIC','NASDAQ Composite','index','low',true,null)
);

-- League schedule + scoring
create table if not exists league_schedule (
  league_id uuid not null references leagues(id) on delete cascade,
  week integer not null,
  home_user_id uuid not null references profiles(id) on delete cascade,
  away_user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (league_id, week, home_user_id, away_user_id)
);

create table if not exists league_scores (
  league_id uuid not null references leagues(id) on delete cascade,
  week integer not null,
  user_id uuid not null references profiles(id) on delete cascade,
  roster_value numeric not null,
  points numeric not null,
  created_at timestamptz not null default now(),
  primary key (league_id, week, user_id)
);

-- GLOSIMAR insights (attached to roster changes and matchups)
create table if not exists glosimar_insights (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references leagues(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  week integer,
  event_type text not null, -- roster_change | matchup | draft
  headline text not null,
  body text not null,
  created_at timestamptz not null default now()
);


-- Track league start for relative week calculation (set when draft completes / league activated)
alter table leagues add column if not exists started_at timestamptz;

create index if not exists idx_league_scores_league_week on league_scores(league_id, week);

-- Optional per-asset mapping for Kraken pairs (e.g., XXBTZUSD, XETHZUSD, SOLUSD).
alter table assets add column if not exists kraken_pair text;

create index if not exists idx_assets_kraken_pair on assets(kraken_pair);
