create or replace function public.gjnml_make_code(n int default 6)
returns text language sql as $$
  select upper(encode(gen_random_bytes(ceil(n/2.0)::int), 'hex'))::text
$$;

create or replace function public.gjnml_set_invite_code()
returns trigger language plpgsql as $$
begin
  if new.invite_code is null or length(new.invite_code) = 0 then
    new.invite_code := 'GJNML-' || substring(public.gjnml_make_code(8) for 8);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_invite_code on public.leagues;
create trigger trg_set_invite_code
before insert on public.leagues
for each row execute function public.gjnml_set_invite_code();
