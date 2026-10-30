-- Losing to another player now costs a star too (never below 0), same as losing to a bot.
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
  update public.profiles set stars = greatest(stars - 1, 0), losses = losses + 1, points = points + 10 where id = v_loser;
  return true;
end;
$$;
