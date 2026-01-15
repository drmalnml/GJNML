-- Block client writes; use server routes (service role)
create policy "leagues_no_client_write"
on leagues for all
using (false)
with check (false);

create policy "league_members_no_client_write"
on league_members for insert
with check (false);
