"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { fetchLeaderboard, tierFor, type Profile } from "@/lib/account";
import { card } from "@/lib/cards";
import { JOKERS, JOKER_IDS } from "@/lib/jokers";
import { play } from "@/lib/sound";
import { RankBadge } from "./AccountSheet";
import CardArt from "./CardArt";
import ComboGuide from "./ComboGuide";
import { ArrowIcon, Logo, SoundToggle } from "./ui";

const FAN = [card(10, "H"), card(11, "D"), card(14, "S"), card(12, "S"), card(13, "H")];

interface Props {
  name: string;
  onName: (name: string) => void;
  profile: Profile | null;
  accountsAvailable: boolean;
  newPlayer: boolean;
  /** Ranked and friend matches are for signed-in players. */
  needsAccount: boolean;
  onMatchmaking: () => void;
  onOnline: () => void;
  onBot: () => void;
  onSkins: () => void;
  onTutorial: () => void;
  onAccount: () => void;
}

function CardFan() {
  const reduce = useReducedMotion();
  return (
    <div className="relative mx-auto h-44 w-full max-w-xs sm:h-56" aria-hidden>
      {FAN.map((c, i) => {
        const offset = i - 2;
        return (
          <motion.div
            key={c.id}
            className="absolute bottom-0 left-1/2 w-24 origin-bottom drop-shadow-[0_16px_20px_rgba(0,0,0,0.28)] sm:w-28"
            initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateX(-50%) translateY(60px) rotate(0deg)" }}
            animate={{
              opacity: 1,
              transform: `translateX(calc(-50% + ${offset * 38}px)) translateY(${Math.abs(offset) * 7}px) rotate(${offset * 9}deg)`,
            }}
            transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1], delay: 0.15 + i * 0.07 }}
          >
            <CardArt card={c} />
          </motion.div>
        );
      })}
    </div>
  );
}

function BigAction({
  title,
  hint,
  tone,
  onClick,
  badge,
}: {
  title: string;
  hint: string;
  tone: "red" | "dark" | "light";
  onClick: () => void;
  badge?: string;
}) {
  const tones = {
    red: "bg-signal text-paper",
    dark: "bg-ink text-paper",
    light: "bg-paper text-ink ring-1 ring-ink/15",
  };
  return (
    <button
      type="button"
      onClick={() => {
        play("click");
        onClick();
      }}
      className={`press group relative flex w-full items-center justify-between gap-4 rounded-[24px] px-5 py-4 text-left sm:px-6 sm:py-5 ${tones[tone]}`}
    >
      <span>
        {badge && <span className="mb-1 inline-block rounded-full bg-signal px-2.5 py-0.5 text-xs font-semibold text-paper">{badge}</span>}
        <span className="block font-display text-lg sm:text-xl">{title}</span>
        <span className={`block text-sm sm:text-base ${tone === "light" ? "text-ink/60" : "text-paper/75"}`}>{hint}</span>
      </span>
      <span
        className={`grid size-11 shrink-0 place-items-center rounded-full transition-transform duration-200 ease-[var(--ease-out)] [@media(hover:hover)]:group-hover:rotate-45 ${
          tone === "light" ? "bg-ink text-paper" : "bg-paper text-ink"
        }`}
      >
        <ArrowIcon className="size-5" />
      </span>
    </button>
  );
}

function Leaderboard({ me }: { me: Profile | null }) {
  const [rows, setRows] = useState<Profile[] | null>(null);
  useEffect(() => {
    void fetchLeaderboard(10).then(setRows);
  }, [me?.stars]);

  return (
    <section className="rounded-[28px] bg-paper p-5 sm:p-6">
      <h2 className="font-display text-lg">Papan peringkat</h2>
      {rows === null ? (
        <p className="mt-4 text-base text-ink/60">Memuat…</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-base text-ink/60">Belum ada yang punya bintang. Jadilah yang pertama.</p>
      ) : (
        <ol className="mt-4 flex flex-col gap-1.5">
          {rows.map((p, i) => (
            <li
              key={p.id}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-base ${p.id === me?.id ? "bg-ink text-paper" : "bg-panel"}`}
            >
              <span className="w-6 text-center font-display text-sm">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate font-medium">{p.username}</span>
              <RankBadge stars={p.stars} className="text-sm" />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default function Menu({
  name,
  onName,
  profile,
  accountsAvailable,
  newPlayer,
  needsAccount,
  onMatchmaking,
  onOnline,
  onBot,
  onSkins,
  onTutorial,
  onAccount,
}: Props) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-3 sm:p-5">
      <header className="flex items-center justify-between gap-2 rounded-full bg-panel p-1.5">
        <Logo />
        <div className="flex items-center gap-1.5">
          <SoundToggle />
          {accountsAvailable && (
            <button
              type="button"
              onClick={() => {
                play("click");
                onAccount();
              }}
              className="press rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper"
            >
              {profile ? <RankBadge stars={profile.stars} /> : "Masuk / Daftar"}
            </button>
          )}
        </div>
      </header>

      <section className="grid grid-cols-1 items-center gap-6 rounded-[32px] bg-paper p-5 sm:p-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="font-display text-[clamp(1.7rem,5vw,2.8rem)] leading-[1.1]">Adu kartu poker, habisi HP lawan.</h1>
            <p className="mt-3 text-base text-ink/70 sm:text-lg">
              Pilih kartu, bikin kombinasi, skor tertinggi nyerang. Satu game sekitar 5 menit.
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            {newPlayer && (
              <BigAction title="Tutorial" hint="Belajar main dalam 1 menit" tone="red" badge="Baru pertama main? Mulai di sini" onClick={onTutorial} />
            )}
            <BigAction title="Cari lawan" hint={needsAccount ? "Ranked, perlu akun" : "Ranked, langsung dipasangin lawan"} tone={newPlayer ? "dark" : "red"} onClick={onMatchmaking} />
            <BigAction title="Main sama teman" hint={needsAccount ? "Bikin room bareng teman, perlu akun" : "Bikin room, kirim link ke teman"} tone="light" onClick={onOnline} />
            <BigAction title="Latihan" hint="Lawan bot santai, tanpa timer" tone="light" onClick={onBot} />
            {!newPlayer && <BigAction title="Tutorial" hint="Ulang cara main" tone="light" onClick={onTutorial} />}
          </div>
          {!profile && (
            <label className="flex items-center gap-3 text-base">
              <span className="text-ink/60">Nama tamu</span>
              <input
                value={name}
                maxLength={14}
                onChange={(e) => onName(e.target.value)}
                size={1}
                className="w-0 min-w-0 flex-1 rounded-full bg-panel px-4 py-2.5 font-medium outline-none focus-visible:ring-2 focus-visible:ring-signal"
              />
            </label>
          )}
        </div>
        <div className="relative hidden overflow-hidden rounded-[28px] bg-panel py-8 md:block">
          <CardFan />
        </div>
      </section>

      {accountsAvailable && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <section className="flex flex-col justify-between gap-4 rounded-[28px] bg-ink p-5 text-paper sm:p-6">
            {profile ? (
              <>
                <div>
                  <p className="text-base text-paper/60">Rank kamu</p>
                  <p className="font-display text-3xl">{tierFor(profile.stars).name}</p>
                </div>
                <p className="font-display text-5xl">
                  <span className="text-signal">★</span> {profile.stars}
                </p>
                <p className="text-base text-paper/70">
                  {profile.wins} menang, {profile.losses} kalah. Di Cari lawan: menang +1 bintang, kalah −1.
                </p>
                <button
                  type="button"
                  onClick={onSkins}
                  className="press flex items-center justify-between gap-3 rounded-2xl bg-paper/10 px-4 py-3 text-left ring-1 ring-paper/20 hover:bg-paper/15"
                >
                  <span>
                    <span className="block font-semibold">Skin kartu</span>
                    <span className="block text-sm text-paper/60">{profile.points} poin buat buka skin baru</span>
                  </span>
                  <span className="font-display text-sm">Buka</span>
                </button>
              </>
            ) : (
              <>
                <div>
                  <p className="font-display text-xl">Kumpulin bintang</p>
                  <p className="mt-2 text-base text-paper/70">
                    Bikin akun, main Cari lawan, kumpulin bintang dan poin. Naik dari Pemula sampai Berlian, buka skin kartu buat dipamerin ke lawan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onAccount}
                  className="press self-start rounded-full bg-signal px-5 py-3 text-base font-semibold text-paper"
                >
                  Bikin akun gratis
                </button>
              </>
            )}
          </section>
          <Leaderboard me={profile} />
        </div>
      )}

      <section id="kombinasi" className="rounded-[28px] bg-paper p-5 sm:p-8">
        <h2 className="mb-3 font-display text-xl">Daftar kombinasi</h2>
        <ComboGuide />
      </section>

      <details className="group rounded-[28px] bg-paper p-5 sm:p-8">
        <summary className="flex cursor-pointer list-none items-center justify-between font-display text-xl">
          Daftar Joker
          <span className="text-2xl transition-transform duration-200 group-open:rotate-45">+</span>
        </summary>
        <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {JOKER_IDS.map((id) => (
            <li key={id} className="flex items-start gap-3 rounded-2xl bg-panel p-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-paper text-xl" aria-hidden>
                {JOKERS[id].icon}
              </span>
              <span className="text-base">
                <span className="block font-semibold">{JOKERS[id].name}</span>
                <span className="text-ink/65">{JOKERS[id].description}</span>
              </span>
            </li>
          ))}
        </ul>
      </details>
    </main>
  );
}
