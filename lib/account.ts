"use client";

import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";

export interface Profile {
  id: string;
  username: string;
  stars: number;
  wins: number;
  losses: number;
}

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  if (!SB_URL || !KEY) return null;
  client ??= createClient(SB_URL, KEY);
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
  if (!sb) throw new AccountError("Akun belum tersedia di server ini.");
  const name = username.trim().toLowerCase();
  if (!USERNAME_RULE.test(name)) throw new AccountError("Username 3–16 karakter: huruf kecil, angka, atau _.");
  if (password.length < 6) throw new AccountError("Password minimal 6 karakter.");

  const { data: free, error: checkError } = await sb.rpc("username_available", { p_username: name });
  if (checkError) throw new AccountError("Ga bisa nyambung ke server. Coba lagi.");
  if (!free) throw new AccountError("Username itu udah dipakai. Coba yang lain.");

  const { data, error } = await sb.auth.signUp({
    email: emailFor(name),
    password,
    options: { data: { username: name } },
  });
  if (error) throw new AccountError(error.message.includes("already") ? "Username itu udah dipakai." : "Gagal bikin akun. Coba lagi.");
  if (!data.session) throw new AccountError("Akun dibuat, tapi server masih minta verifikasi email. Admin perlu matiin \"Confirm email\" di Supabase.");
}

export async function signIn(username: string, password: string) {
  const sb = supabase();
  if (!sb) throw new AccountError("Akun belum tersedia di server ini.");
  const { error } = await sb.auth.signInWithPassword({ email: emailFor(username.trim()), password });
  if (error) throw new AccountError("Username atau password salah.");
}

export async function signOut() {
  await supabase()?.auth.signOut();
}

export async function fetchProfile(id: string): Promise<Profile | null> {
  const { data } = (await supabase()?.from("profiles").select("id, username, stars, wins, losses").eq("id", id).maybeSingle()) ?? {};
  return (data as Profile | null) ?? null;
}

export async function fetchLeaderboard(limit = 10): Promise<Profile[]> {
  const { data } =
    (await supabase()
      ?.from("profiles")
      .select("id, username, stars, wins, losses")
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

export interface Tier {
  name: string;
  min: number;
  next: number | null;
}

const TIERS: Tier[] = [
  { name: "Pemula", min: 0, next: 5 },
  { name: "Perunggu", min: 5, next: 15 },
  { name: "Perak", min: 15, next: 30 },
  { name: "Emas", min: 30, next: 50 },
  { name: "Berlian", min: 50, next: null },
];

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
    setProfile(userId ? await fetchProfile(userId) : null);
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads the profile for the signed-in user
    void refresh();
  }, [refresh]);

  return { ready, userId, profile, refresh, available: supabase() !== null };
}
