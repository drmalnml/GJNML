create extension if not exists "pgcrypto";

create table if not exists leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('public','private','market')),
  mode text not null check (mode in ('learn','compete')),
  max_members int not null default 12,
  invite_code text unique,
  status text not null default 'forming' check (status in ('forming','drafting','active','completed')),
  draft_start_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists league_members (
  league_id uuid references leagues(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member' check (role in ('member','admin')),
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);
