"use client";

import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";

export interface Profile {
  id: string;
  username: string;
  stars: number;
  wins: number;
  losses: number;
  points: number;
  skins: string[];
  skin: string;
  /** Achievement titles earned, and the one shown in matches. */
  titles: string[];
  title: string | null;
  full_houses: number;
  flawless_wins: number;
  /** Current leaderboard spot (1 = top), or null without stars. Filled in by fetchProfile. */
  position?: number | null;
}

const PROFILE_COLUMNS = "id, username, stars, wins, losses, points, skins, skin, titles, title, full_houses, flawless_wins";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  if (!SB_URL || !KEY) return null;
  // Heartbeats from a worker keep room connections alive while a phone tab is in the background.
  client ??= createClient(SB_URL, KEY, { realtime: { worker: true } });
  return client;
}

export const USERNAME_RULE = /^[a-z0-9_]{3,16}$/;

/** Accounts use a username; Supabase Auth needs an email, so we derive one that never receives mail. */
function emailFor(username: string) {
  return `${username.toLowerCase()}@pokerizz.vercel.app`;
}

export class AccountError extends Error {}

export async function signUp(username: string, password: string) {
  const sb = supabase();
  if (!sb) throw new AccountError("Accounts aren't available on this server.");
  const name = username.trim().toLowerCase();
  if (!USERNAME_RULE.test(name)) throw new AccountError("Usernames are 3–16 characters: lowercase letters, numbers or _.");
  if (password.length < 6) throw new AccountError("Passwords need at least 6 characters.");

  const { data: free, error: checkError } = await sb.rpc("username_available", { p_username: name });
  if (checkError) throw new AccountError("Couldn't reach the server. Try again.");
  if (!free) throw new AccountError("That username is taken. Try another one.");

  const { data, error } = await sb.auth.signUp({
    email: emailFor(name),
    password,
    options: { data: { username: name } },
  });
  if (error) throw new AccountError(error.message.includes("already") ? "That username is taken." : "Couldn't create the account. Try again.");
  if (!data.session) throw new AccountError("Account created, but the server still asks for email confirmation. An admin needs to turn off \"Confirm email\" in Supabase.");
}

export async function signIn(username: string, password: string) {
  const sb = supabase();
  if (!sb) throw new AccountError("Accounts aren't available on this server.");
  const { error } = await sb.auth.signInWithPassword({ email: emailFor(username.trim()), password });
  if (error) throw new AccountError("Wrong username or password.");
}

export async function signOut() {
  await supabase()?.auth.signOut();
}

export async function fetchProfile(id: string): Promise<Profile | null> {
  const sb = supabase();
  if (!sb) return null;
  const [{ data }, { data: position }] = await Promise.all([
    sb.from("profiles").select(PROFILE_COLUMNS).eq("id", id).maybeSingle(),
    sb.rpc("leaderboard_position", { p_user: id }),
  ]);
  return data ? { ...(data as Profile), position: (position as number | null) ?? null } : null;
}

export async function fetchLeaderboard(limit = 10): Promise<Profile[]> {
  const { data } =
    (await supabase()
      ?.from("profiles")
      .select(PROFILE_COLUMNS)
      .gt("stars", 0)
      .order("stars", { ascending: false })
      .order("wins", { ascending: false })
      .limit(limit)) ?? {};
  return (data as Profile[] | null) ?? [];
}

/** Called by the losing player; the server credits the winner one star. */
export async function reportLoss(matchId: string, winnerId: string): Promise<boolean> {
  const { data, error } = (await supabase()?.rpc("report_loss", { p_match_id: matchId, p_winner_id: winnerId })) ?? {};
  return !error && data === true;
}

export async function buySkin(skin: string): Promise<boolean> {
  const { data, error } = (await supabase()?.rpc("buy_skin", { p_skin: skin })) ?? {};
  return !error && data === true;
}

export async function equipSkin(skin: string): Promise<boolean> {
  const { data, error } = (await supabase()?.rpc("equip_skin", { p_skin: skin })) ?? {};
  return !error && data === true;
}

/** Registers a ranked game against a matchmaking bot; null when it won't count. */
export async function startBotMatch(level: number): Promise<string | null> {
  const { data, error } = (await supabase()?.rpc("start_bot_match", { p_level: level })) ?? {};
  return error ? null : ((data as string | null) ?? null);
}

/** The star change the server applied (+1, -1, 0), or null when the match didn't count. */
export async function finishBotMatch(matchId: string, won: boolean): Promise<number | null> {
  const { data, error } = (await supabase()?.rpc("finish_bot_match", { p_match_id: matchId, p_won: won })) ?? {};
  return error || data === null || data === undefined ? null : Number(data);
}

/** Full Houses played and whether the player won without losing HP, once per match. */
export async function recordMatchStats(matchId: string, fullHouses: number, flawless: boolean): Promise<void> {
  await supabase()?.rpc("record_match_stats", { p_match_id: matchId, p_full_houses: fullHouses, p_flawless: flawless });
}

/** Grants any titles the player now qualifies for (such as being #1 on the leaderboard). */
export async function claimTitles(): Promise<void> {
  await supabase()?.rpc("claim_titles");
}

export async function equipTitle(title: string | null): Promise<boolean> {
  const { data, error } = (await supabase()?.rpc("equip_title", { p_title: title })) ?? {};
  return !error && data === true;
}

export interface Tier {
  name: string;
  min: number;
  next: number | null;
}

const TIERS: Tier[] = [
  { name: "Rookie", min: 0, next: 5 },
  { name: "Bronze", min: 5, next: 15 },
  { name: "Silver", min: 15, next: 30 },
  { name: "Gold", min: 30, next: 50 },
  { name: "Diamond", min: 50, next: null },
];

export function tierIndex(stars: number): number {
  return TIERS.findLastIndex((t) => stars >= t.min);
}

export function tierFor(stars: number): Tier {
  return [...TIERS].reverse().find((t) => stars >= t.min)!;
}

/** Current session and profile, kept in sync with Supabase Auth. */
export function useAccount() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(() => supabase() === null);

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    void sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = sb.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;
  const refresh = useCallback(async () => {
    if (userId) await claimTitles();
    setProfile(userId ? await fetchProfile(userId) : null);
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads the profile for the signed-in user
    void refresh();
  }, [refresh]);

  return { ready, userId, profile, refresh, available: supabase() !== null };
}
