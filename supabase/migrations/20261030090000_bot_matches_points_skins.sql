-- Points (earned from ranked games) and card skins bought with them.
alter table public.profiles
  add column points integer not null default 0 check (points >= 0),
  add column skins text[] not null default '{classic}',
  add column skin text not null default 'classic';

-- Prices live in the database so the client can't decide what a skin costs.
create table public.skin_prices (
  id text primary key,
  price integer not null check (price >= 0)
);

insert into public.skin_prices (id, price) values
  ('classic', 0),
  ('blueprint', 100),
  ('sakura', 200),
  ('neon', 300),
  ('gold', 450),
  ('void', 600);

alter table public.skin_prices enable row level security;

create policy "Skin prices are public"
  on public.skin_prices for select
  to anon, authenticated
  using (true);

create function public.buy_skin(p_skin text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_price integer;
begin
  if v_user is null then
    raise exception 'not signed in';
  end if;
  select price into v_price from public.skin_prices where id = p_skin;
  if v_price is null then
    raise exception 'unknown skin';
  end if;
  update public.profiles
  set points = points - v_price, skins = array_append(skins, p_skin), skin = p_skin
  where id = v_user and points >= v_price and not (p_skin = any (skins));
  return found;
end;
$$;

create function public.equip_skin(p_skin text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set skin = p_skin where id = auth.uid() and p_skin = any (skins);
  return found;
end;
$$;

-- Ranked games against a matchmaking bot: win +1 star, loss -1 (never below 0).
-- The game runs on the player's device, so the server can't verify the result; these
-- rules only slow down abuse: a match must be started first, last at least 20 seconds,
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

-- Returns the change in stars (+1, -1, or 0 at zero stars), or null when the match doesn't count.
create function public.finish_bot_match(p_match_id uuid, p_won boolean)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_before integer;
begin
  if v_user is null then
    raise exception 'not signed in';
  end if;

  update public.bot_matches
  set finished_at = now(), won = p_won
  where id = p_match_id
    and user_id = v_user
    and finished_at is null
    and started_at < now() - interval '20 seconds';
  if not found then
    return null;
  end if;

  select stars into v_before from public.profiles where id = v_user;
  if p_won then
    update public.profiles set stars = stars + 1, wins = wins + 1, points = points + 30 where id = v_user;
    return 1;
  end if;
  update public.profiles
  set losses = losses + 1, stars = greatest(stars - 1, 0), points = points + 10
  where id = v_user;
  return case when v_before > 0 then -1 else 0 end;
end;
$$;

-- Online games between two signed-in players now also give points.
create or replace function public.report_loss(p_match_id uuid, p_winner_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loser uuid := auth.uid();
  v_today integer;
begin
  if v_loser is null then
    raise exception 'not signed in';
  end if;
  if p_winner_id = v_loser then
    raise exception 'cannot report a win for yourself';
  end if;
  if not exists (select 1 from public.profiles where id = p_winner_id) then
    raise exception 'unknown winner';
  end if;

  select count(*) into v_today
  from public.matches
  where winner_id = p_winner_id and loser_id = v_loser
    and created_at > now() - interval '1 day';
  if v_today >= 10 then
    return false;
  end if;

  insert into public.matches (id, winner_id, loser_id)
  values (p_match_id, p_winner_id, v_loser)
  on conflict (id) do nothing;
  if not found then
    return false;
  end if;

  update public.profiles set stars = stars + 1, wins = wins + 1, points = points + 30 where id = p_winner_id;
  update public.profiles set losses = losses + 1, points = points + 10 where id = v_loser;
  return true;
end;
$$;

revoke all on function public.buy_skin(text) from public, anon;
revoke all on function public.equip_skin(text) from public, anon;
revoke all on function public.start_bot_match(smallint) from public, anon;
revoke all on function public.finish_bot_match(uuid, boolean) from public, anon;
grant execute on function public.buy_skin(text) to authenticated;
grant execute on function public.equip_skin(text) to authenticated;
grant execute on function public.start_bot_match(smallint) to authenticated;
grant execute on function public.finish_bot_match(uuid, boolean) to authenticated;
