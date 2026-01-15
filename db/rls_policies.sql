alter table leagues enable row level security;
alter table league_members enable row level security;
alter table invites enable row level security;
alter table invite_redemptions enable row level security;

create policy "leagues_select_member_or_public"
on leagues for select
using (
  type = 'public'
  OR exists (select 1 from league_members m where m.league_id = leagues.id and m.user_id = auth.uid())
);

create policy "league_members_select_own"
on league_members for select
using (user_id = auth.uid());

create policy "invites_no_client_select"
on invites for select using (false);

create policy "invite_redemptions_select_own"
on invite_redemptions for select
using (user_id = auth.uid());

create policy "invite_redemptions_no_client_insert"
on invite_redemptions for insert
with check (false);
