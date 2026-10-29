-- Ranked games against a bot from matchmaking: win +1 star, loss -1 (never below 0).
-- The game runs on the player's device, so the server can't verify the result; these
-- rules only slow down abuse: a match must be started first, last at least a minute,
-- be reported once, and a player gets at most 30 per day.
create table public.bot_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  bot_level smallint not null check (bot_level between 0 and 4),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  won boolean
);

create index bot_matches_user_day_idx on public.bot_matches (user_id, started_at desc);

alter table public.bot_matches enable row level security;

create policy "Players see their own bot matches"
  on public.bot_matches for select
  to authenticated
  using ((select auth.uid()) = user_id);

create function public.start_bot_match(p_level smallint)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then
    raise exception 'not signed in';
  end if;
  if (select count(*) from public.bot_matches
      where user_id = v_user and started_at > now() - interval '1 day') >= 30 then
    return null;
  end if;
  insert into public.bot_matches (user_id, bot_level) values (v_user, p_level) returning id into v_id;
  return v_id;
end;
$$;

-- Returns the change in stars that was applied (+1, -1, or 0 when nothing counted).
create function public.finish_bot_match(p_match_id uuid, p_won boolean)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_delta integer;
begin
  if v_user is null then
    raise exception 'not signed in';
  end if;

  update public.bot_matches
  set finished_at = now(), won = p_won
  where id = p_match_id
    and user_id = v_user
    and finished_at is null
    and started_at < now() - interval '60 seconds';
  if not found then
    return 0;
  end if;

  if p_won then
    update public.profiles set stars = stars + 1, wins = wins + 1 where id = v_user;
    v_delta := 1;
  else
    update public.profiles
    set losses = losses + 1, stars = greatest(stars - 1, 0)
    where id = v_user
    returning case when stars = 0 then 0 else -1 end into v_delta;
    v_delta := coalesce(v_delta, 0);
  end if;
  return v_delta;
end;
$$;

revoke all on function public.start_bot_match(smallint) from public, anon;
revoke all on function public.finish_bot_match(uuid, boolean) from public, anon;
grant execute on function public.start_bot_match(smallint) to authenticated;
grant execute on function public.finish_bot_match(uuid, boolean) to authenticated;
