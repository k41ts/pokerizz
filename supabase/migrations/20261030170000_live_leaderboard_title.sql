-- The leaderboard title now follows the player's current position (TOP 1–3) instead of being
-- earned once, so it is no longer stored in `titles`. Also fixes claim_titles appending text
-- to a text[] without a cast, which made it (and record_match_stats) fail.
create or replace function public.leaderboard_position(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case when me.stars > 0 then (
    select count(*)::integer + 1 from public.profiles o
    where o.stars > me.stars or (o.stars = me.stars and o.wins > me.wins)
  ) end
  from public.profiles me where me.id = p_user;
$$;

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
begin
  if v_user is null then
    raise exception 'not signed in';
  end if;
  select * into v_profile from public.profiles where id = v_user;
  if not found then
    return '{}';
  end if;
  if v_profile.full_houses >= 25 then
    v_new := array_append(v_new, 'king_full_house'::text);
  end if;
  if v_profile.flawless_wins >= 1 then
    v_new := array_append(v_new, 'untouchable'::text);
  end if;

  update public.profiles
  set titles = array(select distinct unnest(titles || v_new))
  where id = v_user and not (titles @> v_new)
  returning titles into v_profile.titles;
  return coalesce(v_profile.titles, '{}');
end;
$$;

-- 'leaderboard' can be worn only while the player is in the top 3.
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
  if p_title = 'leaderboard' and coalesce(public.leaderboard_position(v_user), 99) > 3 then
    return false;
  end if;
  update public.profiles set title = p_title
  where id = v_user
    and (p_title is null or p_title = 'leaderboard' or titles @> array[p_title]);
  return found;
end;
$$;

update public.profiles set titles = array_remove(titles, 'top_1');

revoke all on function public.leaderboard_position(uuid) from public, anon;
grant execute on function public.leaderboard_position(uuid) to authenticated;
