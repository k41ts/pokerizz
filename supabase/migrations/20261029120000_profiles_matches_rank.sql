-- Player profiles: one per auth user, readable by everyone for the leaderboard.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,16}$'),
  stars integer not null default 0 check (stars >= 0),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  created_at timestamptz not null default now()
);

create index profiles_stars_idx on public.profiles (stars desc, wins desc);

alter table public.profiles enable row level security;

create policy "Profiles are public"
  on public.profiles for select
  to anon, authenticated
  using (true);

-- Finished online matches. Written only by report_loss().
create table public.matches (
  id uuid primary key,
  winner_id uuid not null references public.profiles (id) on delete cascade,
  loser_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (winner_id <> loser_id)
);

create index matches_pair_day_idx on public.matches (winner_id, loser_id, created_at desc);
create index matches_loser_idx on public.matches (loser_id);

alter table public.matches enable row level security;

create policy "Players see their own matches"
  on public.matches for select
  to authenticated
  using ((select auth.uid()) in (winner_id, loser_id));

-- Create the profile from the username given at sign-up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, lower(new.raw_user_meta_data ->> 'username'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The losing player confirms the result, so nobody can award themselves a star.
-- The same pair can only count 10 wins per day, to slow down farming with a friend.
create function public.report_loss(p_match_id uuid, p_winner_id uuid)
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

  update public.profiles set stars = stars + 1, wins = wins + 1 where id = p_winner_id;
  update public.profiles set losses = losses + 1 where id = v_loser;
  return true;
end;
$$;

revoke all on function public.report_loss(uuid, uuid) from public, anon;
grant execute on function public.report_loss(uuid, uuid) to authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Lets the sign-up form say "username taken" before creating the account.
create function public.username_available(p_username text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select not exists (select 1 from public.profiles where username = lower(p_username));
$$;

grant execute on function public.username_available(text) to anon, authenticated;
