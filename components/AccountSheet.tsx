"use client";

import { useState } from "react";
import { AccountError, equipTitle, signIn, signOut, signUp, tierFor, type Profile } from "@/lib/account";
import { FULL_HOUSE_GOAL, LEADERBOARD_TOP, shownTitle, TITLE_IDS, TITLES, type TitleId } from "@/lib/titles";
import { play } from "@/lib/sound";
import Sheet from "./Sheet";
import { TitleBadge } from "./TitleBadge";
import { PrimaryButton } from "./ui";

interface Props {
  open: boolean;
  onClose: () => void;
  profile: Profile | null;
  onChanged: () => void;
  /** Why the sheet opened, when a guest tried something that needs an account. */
  reason?: string;
  /** Called instead of onClose after a successful sign-in or sign-up. */
  onSignedIn?: () => void;
}

export function RankBadge({ stars, className = "" }: { stars: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${className}`}>
      <span className="text-signal">★</span>
      <span className="font-semibold tabular-nums">{stars}</span>
      <span className="opacity-60">{tierFor(stars).name}</span>
    </span>
  );
}

function progressFor(id: TitleId, profile: Profile): string | null {
  if (id === "king_full_house") return `${Math.min(profile.full_houses, FULL_HOUSE_GOAL)}/${FULL_HOUSE_GOAL} Full Houses`;
  if (id === "leaderboard") return profile.position ? `You're #${profile.position}.` : "Win a match to get on the board.";
  return null;
}

/** Earned titles can be equipped; the rest show what it takes to get them. */
function Achievements({ profile, onChanged }: { profile: Profile; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  async function wear(title: string | null) {
    setBusy(true);
    play("click");
    if (await equipTitle(title)) onChanged();
    setBusy(false);
  }
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-display text-base">Titles</h3>
      <p className="text-sm text-ink/60">Wear one and opponents see it under your name in every match. Top {LEADERBOARD_TOP} players show their spot automatically.</p>
      <ul className="flex flex-col gap-2">
        {TITLE_IDS.map((id) => {
          const top = !!profile.position && profile.position <= LEADERBOARD_TOP;
          const owned = id === "leaderboard" ? top : profile.titles.includes(id);
          const badge = id === "leaderboard" ? `top:${top ? profile.position : 1}` : id;
          const worn = shownTitle(profile.title, profile.position) === badge;
          const progress = progressFor(id, profile);
          return (
            <li key={id} className={`flex items-center gap-3 rounded-2xl p-3 ${owned ? "bg-panel" : "bg-panel/50"}`}>
              <div className="min-w-0 flex-1">
                <div className={owned ? "" : "opacity-40 grayscale"}>
                  <TitleBadge id={badge} />
                </div>
                <p className="mt-1.5 text-sm text-ink/60">
                  {TITLES[id].how}
                  {!owned && progress && <span className="ml-1 font-semibold text-ink">{progress}</span>}
                </p>
              </div>
              {owned && (
                <button
                  type="button"
                  disabled={busy}
                  // The leaderboard title is the default for top players, so it can't be taken off.
                  onClick={() => void wear(worn ? (id === "leaderboard" ? "leaderboard" : null) : id)}
                  className={`press shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold ${worn ? "bg-ink text-paper" : "bg-paper ring-1 ring-ink/15"}`}
                >
                  {worn ? "Wearing" : "Wear"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ProfileView({ profile, onSignOut, onChanged }: { profile: Profile; onSignOut: () => void; onChanged: () => void }) {
  const tier = tierFor(profile.stars);
  const progress = tier.next === null ? 1 : (profile.stars - tier.min) / (tier.next - tier.min);
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-ink p-5 text-paper">
        <p className="text-sm text-paper/60">Signed in as</p>
        <p className="font-display text-xl">{profile.username}</p>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-paper/60">Rank</p>
            <p className="font-display text-2xl">{tier.name}</p>
          </div>
          <p className="font-display text-4xl">
            <span className="text-signal">★</span> {profile.stars}
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper/15">
          <div className="h-full origin-left rounded-full bg-signal" style={{ transform: `scaleX(${progress})` }} />
        </div>
        <p className="mt-2 text-sm text-paper/60">
          {tier.next === null ? "Top rank. Hold on to it!" : `${tier.next - profile.stars} more star${tier.next - profile.stars === 1 ? "" : "s"} to the next rank`}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-2xl bg-panel p-3">
          <p className="font-display text-2xl">{profile.wins}</p>
          <p className="text-sm text-ink/60">Wins</p>
        </div>
        <div className="rounded-2xl bg-panel p-3">
          <p className="font-display text-2xl">{profile.losses}</p>
          <p className="text-sm text-ink/60">Losses</p>
        </div>
      </div>
      <Achievements profile={profile} onChanged={onChanged} />
      <button type="button" onClick={onSignOut} className="self-start text-sm text-ink/60 underline underline-offset-4 hover:text-ink">
        Sign out
      </button>
    </div>
  );
}

export default function AccountSheet({ open, onClose, profile, onChanged, reason, onSignedIn }: Props) {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") await signUp(username, password);
      else await signIn(username, password);
      play("connect");
      setPassword("");
      onChanged();
      (onSignedIn ?? onClose)();
    } catch (err) {
      setError(err instanceof AccountError ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={profile ? "Your account" : mode === "signup" ? "Create an account" : "Sign in"}>
      {profile ? (
        <ProfileView
          profile={profile}
          onChanged={onChanged}
          onSignOut={async () => {
            await signOut();
            onChanged();
          }}
        />
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {reason && <p className="rounded-2xl bg-ink px-4 py-3 text-base text-paper">{reason}</p>}
          <div className="grid grid-cols-2 gap-1 rounded-full bg-panel p-1" role="tablist">
            {(["signup", "signin"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={`press rounded-full py-2.5 text-sm font-semibold ${mode === m ? "bg-ink text-paper" : "text-ink/70"}`}
              >
                {m === "signup" ? "New here" : "I have an account"}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-ink/70">Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              maxLength={16}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="e.g. kai_poker"
              className="rounded-2xl bg-panel px-4 py-3.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-signal"
            />
            {mode === "signup" && <span className="text-ink/50">3–16 characters: lowercase letters, numbers or _</span>}
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-ink/70">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder="at least 6 characters"
              className="rounded-2xl bg-panel px-4 py-3.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-signal"
            />
          </label>
          {error && (
            <p role="alert" className="rounded-2xl bg-signal/10 px-4 py-3 text-sm text-signal">
              {error}
            </p>
          )}
          <PrimaryButton tone="red" disabled={busy || username.length < 3 || password.length < 6} onClick={() => void submit()} className="self-start text-base">
            {busy ? "One moment…" : mode === "signup" ? "Create account" : "Sign in"}
          </PrimaryButton>
          <p className="text-sm text-ink/60">You need an account to find matches, play friends, collect stars and climb the ranks. Practice and the tutorial work without one.</p>
        </form>
      )}
    </Sheet>
  );
}
