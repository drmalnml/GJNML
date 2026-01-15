create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  issued_to_email text,
  issued_by uuid,
  max_uses int not null default 1,
  uses int not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists invite_redemptions (
  invite_id uuid references invites(id) on delete cascade,
  user_id uuid not null,
  redeemed_at timestamptz not null default now(),
  primary key (invite_id, user_id)
);
