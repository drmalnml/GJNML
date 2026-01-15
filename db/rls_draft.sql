alter table assets enable row level security;
alter table league_assets enable row level security;
alter table draft_state enable row level security;
alter table draft_order enable row level security;
alter table draft_picks enable row level security;
alter table rosters enable row level security;

create policy "assets_read_all"
on assets for select
using (true);

create policy "league_assets_read_members"
on league_assets for select
using (exists (select 1 from league_members m where m.league_id = league_assets.league_id and m.user_id = auth.uid()));

create policy "draft_state_read_members"
on draft_state for select
using (exists (select 1 from league_members m where m.league_id = draft_state.league_id and m.user_id = auth.uid()));

create policy "draft_order_read_members"
on draft_order for select
using (exists (select 1 from league_members m where m.league_id = draft_order.league_id and m.user_id = auth.uid()));

create policy "draft_picks_read_members"
on draft_picks for select
using (exists (select 1 from league_members m where m.league_id = draft_picks.league_id and m.user_id = auth.uid()));

create policy "rosters_read_members"
on rosters for select
using (exists (select 1 from league_members m where m.league_id = rosters.league_id and m.user_id = auth.uid()));

create policy "draft_state_no_client_write" on draft_state for all using (false) with check (false);
create policy "draft_order_no_client_write" on draft_order for all using (false) with check (false);
create policy "draft_picks_no_client_write" on draft_picks for insert with check (false);
create policy "rosters_no_client_write" on rosters for insert with check (false);
create policy "league_assets_no_client_write" on league_assets for insert with check (false);
