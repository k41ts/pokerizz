-- Achievement titles: earned once, kept for good, one of them shown in matches.
alter table public.profiles
  add column if not exists full_houses integer not null default 0,
  add column if not exists flawless_wins integer not null default 0,
  add column if not exists titles text[] not null default '{}',
  add column if not exists title text;

-- One stats report per player per match.
create table if not exists public.match_stats (
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, match_id)
);
alter table public.match_stats enable row level security;

-- Grants every title the caller qualifies for and returns their titles.
create or replace function public.claim_titles()
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_profile public.profiles;
  v_new text[] := '{}';
  v_top uuid;
begin
  if v_user is null then
    raise exception 'not signed in';
  end if;
  select * into v_profile from public.profiles where id = v_user;
  if not found then
    return '{}';
  end if;

  select id into v_top from public.profiles
  where stars > 0
  order by stars desc, wins desc
  limit 1;
  if v_top = v_user then
    v_new := v_new || 'top_1';
  end if;
  if v_profile.full_houses >= 25 then
    v_new := v_new || 'king_full_house';
  end if;
  if v_profile.flawless_wins >= 1 then
    v_new := v_new || 'untouchable';
  end if;

  update public.profiles
  set titles = array(select distinct unnest(titles || v_new))
  where id = v_user and not (titles @> v_new)
  returning titles into v_profile.titles;
  return coalesce(v_profile.titles, '{}');
end;
$$;

-- Reported by each signed-in player when a ranked or friend match ends.
create or replace function public.record_match_stats(p_match_id uuid, p_full_houses integer, p_flawless boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_today integer;
begin
  if v_user is null then
    raise exception 'not signed in';
  end if;
  select count(*) into v_today from public.match_stats
  where user_id = v_user and created_at > now() - interval '1 day';
  if v_today >= 120 then
    return false;
  end if;

  insert into public.match_stats (user_id, match_id) values (v_user, p_match_id)
  on conflict do nothing;
  if not found then
    return false;
  end if;

  -- A match rarely runs past a dozen rounds, so more Full Houses than that isn't believable.
  update public.profiles
  set full_houses = full_houses + least(greatest(coalesce(p_full_houses, 0), 0), 12),
      flawless_wins = flawless_wins + case when p_flawless then 1 else 0 end
  where id = v_user;
  perform public.claim_titles();
  return true;
end;
$$;

create or replace function public.equip_title(p_title text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not signed in';
  end if;
  update public.profiles set title = p_title
  where id = v_user and (p_title is null or titles @> array[p_title]);
  return found;
end;
$$;

revoke all on function public.claim_titles() from public, anon;
revoke all on function public.record_match_stats(uuid, integer, boolean) from public, anon;
revoke all on function public.equip_title(text) from public, anon;
grant execute on function public.claim_titles() to authenticated;
grant execute on function public.record_match_stats(uuid, integer, boolean) to authenticated;
grant execute on function public.equip_title(text) to authenticated;
