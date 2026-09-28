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