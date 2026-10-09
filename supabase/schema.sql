create table if not exists public.acm_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{"equipamentos":[],"prestadores":[],"manutencoes":[],"eventos":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.acm_state enable row level security;
revoke all on public.acm_state from anon, public;
grant select, insert, update on public.acm_state to authenticated;

drop policy if exists "users access their own ACM state" on public.acm_state;
create policy "users access their own ACM state"
  on public.acm_state
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table if not exists public.acm_shared_state (
  id smallint primary key default 1 check (id = 1),
  payload jsonb not null default '{"equipamentos":[],"prestadores":[],"manutencoes":[],"eventos":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.acm_shared_state enable row level security;
revoke all on public.acm_shared_state from anon, public;
grant select, insert, update on public.acm_shared_state to anon, authenticated;

drop policy if exists "public access to shared ACM state" on public.acm_shared_state;
create policy "public access to shared ACM state"
  on public.acm_shared_state
  for all
  to anon, authenticated
  using (true)
  with check (true);

create table if not exists public.acm_equipamentos (
  id text primary key,
  payload jsonb not null
);

create table if not exists public.acm_prestadores (
  id text primary key,
  payload jsonb not null
);

create table if not exists public.acm_manutencoes (
  id text primary key,
  payload jsonb not null
);

create table if not exists public.acm_eventos (
  id text primary key,
  payload jsonb not null
);

alter table public.acm_equipamentos enable row level security;
alter table public.acm_prestadores enable row level security;
alter table public.acm_manutencoes enable row level security;
alter table public.acm_eventos enable row level security;

revoke all on public.acm_equipamentos, public.acm_prestadores, public.acm_manutencoes, public.acm_eventos from anon, public;
grant select on public.acm_equipamentos, public.acm_prestadores, public.acm_manutencoes, public.acm_eventos to anon, authenticated;

drop policy if exists "public read ACM equipment" on public.acm_equipamentos;
create policy "public read ACM equipment" on public.acm_equipamentos for select to anon, authenticated using (true);
drop policy if exists "public read ACM providers" on public.acm_prestadores;
create policy "public read ACM providers" on public.acm_prestadores for select to anon, authenticated using (true);
drop policy if exists "public read ACM maintenance" on public.acm_manutencoes;
create policy "public read ACM maintenance" on public.acm_manutencoes for select to anon, authenticated using (true);
drop policy if exists "public read ACM events" on public.acm_eventos;
create policy "public read ACM events" on public.acm_eventos for select to anon, authenticated using (true);

create or replace function public.sync_acm_data(p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.acm_equipamentos (id, payload)
  select item.value ->> 'id', item.value
  from jsonb_array_elements(coalesce(p_payload -> 'equipamentos', '[]'::jsonb)) as item(value)
  where item.value ->> 'id' is not null
  on conflict (id) do update set payload = excluded.payload;
  delete from public.acm_equipamentos existing
  where not exists (
    select 1 from jsonb_array_elements(coalesce(p_payload -> 'equipamentos', '[]'::jsonb)) as item(value)
    where item.value ->> 'id' = existing.id
  );

  insert into public.acm_prestadores (id, payload)
  select item.value ->> 'id', item.value
  from jsonb_array_elements(coalesce(p_payload -> 'prestadores', '[]'::jsonb)) as item(value)
  where item.value ->> 'id' is not null
  on conflict (id) do update set payload = excluded.payload;
  delete from public.acm_prestadores existing
  where not exists (
    select 1 from jsonb_array_elements(coalesce(p_payload -> 'prestadores', '[]'::jsonb)) as item(value)
    where item.value ->> 'id' = existing.id
  );

  insert into public.acm_manutencoes (id, payload)
  select item.value ->> 'id', item.value
  from jsonb_array_elements(coalesce(p_payload -> 'manutencoes', '[]'::jsonb)) as item(value)
  where item.value ->> 'id' is not null
  on conflict (id) do update set payload = excluded.payload;
  delete from public.acm_manutencoes existing
  where not exists (
    select 1 from jsonb_array_elements(coalesce(p_payload -> 'manutencoes', '[]'::jsonb)) as item(value)
    where item.value ->> 'id' = existing.id
  );

  insert into public.acm_eventos (id, payload)
  select item.value ->> 'id', item.value
  from jsonb_array_elements(coalesce(p_payload -> 'eventos', '[]'::jsonb)) as item(value)
  where item.value ->> 'id' is not null
  on conflict (id) do update set payload = excluded.payload;
  delete from public.acm_eventos existing
  where not exists (
    select 1 from jsonb_array_elements(coalesce(p_payload -> 'eventos', '[]'::jsonb)) as item(value)
    where item.value ->> 'id' = existing.id
  );
end;
$$;

revoke all on function public.sync_acm_data(jsonb) from public;
grant execute on function public.sync_acm_data(jsonb) to anon, authenticated;