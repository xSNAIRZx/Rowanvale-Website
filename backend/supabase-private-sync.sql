-- Rowanvale 18.5 private cloud storage. Review and run in your own Supabase SQL editor.
-- It upgrades the existing mindforge_saves table; it creates no public profile or social service.
begin;
create table if not exists public.mindforge_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  version bigint not null default 1
);
alter table public.mindforge_saves add column if not exists version bigint not null default 1;
create table if not exists public.rowanvale_save_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  version bigint not null,
  data jsonb not null,
  saved_at timestamptz not null default now(),
  primary key(user_id,version)
);
alter table public.mindforge_saves enable row level security;
alter table public.rowanvale_save_history enable row level security;
-- Replace policies on these two private application tables so a pre-existing permissive policy cannot leak rows.
do $$ declare p record; begin
 for p in select policyname,tablename from pg_policies where schemaname='public' and tablename in ('mindforge_saves','rowanvale_save_history') loop
  execute format('drop policy %I on public.%I',p.policyname,p.tablename);
 end loop;
end $$;
create policy rowanvale_own_save on public.mindforge_saves for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy rowanvale_own_history on public.rowanvale_save_history for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
revoke all on public.mindforge_saves,public.rowanvale_save_history from anon;
revoke insert,update,delete on public.mindforge_saves from authenticated;
grant select on public.mindforge_saves to authenticated;
revoke insert,update,delete on public.rowanvale_save_history from authenticated;
grant select on public.rowanvale_save_history to authenticated;
create or replace function public.rowanvale_compare_and_save(p_expected_version bigint,p_data jsonb,p_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_row public.mindforge_saves%rowtype; new_version bigint; actor uuid:=auth.uid();
begin
 if actor is null or actor is distinct from p_user_id then raise exception 'The signed-in account changed.' using errcode='42501'; end if;
 if p_expected_version is null or p_expected_version<0 or p_data is null or jsonb_typeof(p_data) is distinct from 'object' or jsonb_typeof(p_data->'data') is distinct from 'object' or octet_length(p_data::text)>12582912 then
  raise exception 'Invalid or oversized Rowanvale snapshot.' using errcode='22023';
 end if;
 -- An account-scoped advisory lock also protects the first insert when no row exists.
 perform pg_advisory_xact_lock(hashtextextended(actor::text,185));
 select * into current_row from public.mindforge_saves where user_id=actor for update;
 if not found then
  if p_expected_version<>0 then raise exception 'The cloud version changed.' using errcode='40001'; end if;
  new_version:=1;
  insert into public.mindforge_saves(user_id,data,version,updated_at) values(actor,p_data,new_version,now());
 else
  if current_row.version<>p_expected_version then raise exception 'The cloud version changed.' using errcode='40001'; end if;
  insert into public.rowanvale_save_history(user_id,version,data) values(actor,current_row.version,current_row.data) on conflict do nothing;
  new_version:=current_row.version+1;
  update public.mindforge_saves set data=p_data,version=new_version,updated_at=now() where user_id=actor;
  delete from public.rowanvale_save_history where user_id=actor and version not in (select version from public.rowanvale_save_history where user_id=actor order by version desc limit 5);
 end if;
 return jsonb_build_object('version',new_version);
end $$;
revoke all on function public.rowanvale_compare_and_save(bigint,jsonb,uuid) from public,anon;
grant execute on function public.rowanvale_compare_and_save(bigint,jsonb,uuid) to authenticated;
commit;
