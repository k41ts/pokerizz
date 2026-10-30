"use client";

import { useState } from "react";
import { AccountError, signIn, signOut, signUp, tierFor, type Profile } from "@/lib/account";
import { play } from "@/lib/sound";
import Sheet from "./Sheet";
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

function ProfileView({ profile, onSignOut }: { profile: Profile; onSignOut: () => void }) {
  const tier = tierFor(profile.stars);
  const progress = tier.next === null ? 1 : (profile.stars - tier.min) / (tier.next - tier.min);
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-ink p-5 text-paper">
        <p className="text-sm text-paper/60">Masuk sebagai</p>
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
          {tier.next === null ? "Rank tertinggi. Pertahankan!" : `${tier.next - profile.stars} bintang lagi ke rank berikutnya`}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-2xl bg-panel p-3">
          <p className="font-display text-2xl">{profile.wins}</p>
          <p className="text-sm text-ink/60">Menang</p>
        </div>
        <div className="rounded-2xl bg-panel p-3">
          <p className="font-display text-2xl">{profile.losses}</p>
          <p className="text-sm text-ink/60">Kalah</p>
        </div>
      </div>
      <p className="text-sm text-ink/60">Tiap menang online lawan pemain yang juga login: +1 bintang.</p>
      <button type="button" onClick={onSignOut} className="self-start text-sm text-ink/60 underline underline-offset-4 hover:text-ink">
        Keluar dari akun
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
      setError(err instanceof AccountError ? err.message : "Ada yang salah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={profile ? "Akunmu" : mode === "signup" ? "Bikin akun" : "Masuk"}>
      {profile ? (
        <ProfileView
          profile={profile}
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
                {m === "signup" ? "Daftar baru" : "Udah punya akun"}
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
              placeholder="contoh: kai_poker"
              className="rounded-2xl bg-panel px-4 py-3.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-signal"
            />
            {mode === "signup" && <span className="text-ink/50">3–16 karakter: huruf kecil, angka, atau _</span>}
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-ink/70">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder="minimal 6 karakter"
              className="rounded-2xl bg-panel px-4 py-3.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-signal"
            />
          </label>
          {error && (
            <p role="alert" className="rounded-2xl bg-signal/10 px-4 py-3 text-sm text-signal">
              {error}
            </p>
          )}
          <PrimaryButton tone="red" disabled={busy || username.length < 3 || password.length < 6} onClick={() => void submit()} className="self-start text-base">
            {busy ? "Sebentar…" : mode === "signup" ? "Bikin akun" : "Masuk"}
          </PrimaryButton>
          <p className="text-sm text-ink/60">Akun dipakai buat ngumpulin bintang dan naik rank. Main lawan bot ga perlu akun.</p>
        </form>
      )}
    </Sheet>
  );
}
