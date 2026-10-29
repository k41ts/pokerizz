"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Logo, SoundToggle } from "@/components/ui";
import { SKIN_IDS, SKINS } from "@/lib/skins";
import { isMuted, play, setMuted, SFX_LIST, type Sfx } from "@/lib/sound";

/** What each sound is, in the player's words. Combo has a small and a big version. */
const LABEL: Record<Sfx, string> = {
  select: "Pilih kartu",
  deselect: "Batal pilih",
  deal: "Bagi kartu",
  discard: "Buang",
  play: "Pasang kartu",
  flip: "Buka kartu",
  chip: "Hitung skor",
  stamp: "Stempel kombo",
  combo: "Kombo",
  joker: "Joker",
  win: "Menang",
  hit: "Kena serang",
  block: "Tameng",
  heal: "Heal",
  lose: "Kalah",
  click: "Klik",
  connect: "Nyambung",
};

/** One round, compressed: pick, play, reveal, count, combo, win. */
const DEMO: [number, Sfx, number][] = [
  [0, "select", 0],
  [220, "select", 0],
  [600, "play", 0],
  [1700, "flip", 0],
  [2000, "chip", 0],
  [2200, "chip", 1],
  [2400, "chip", 2],
  [2600, "chip", 3],
  [2900, "stamp", 0],
  [3500, "combo", 8],
  [6200, "win", 0],
];

function useDemo() {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  return (voice: string) => {
    timers.current.forEach(clearTimeout);
    timers.current = DEMO.map(([at, sfx, step]) => setTimeout(() => play(sfx, step, voice), at));
  };
}

function SoundButtons({ voice, compact }: { voice: string; compact?: boolean }) {
  const list = SFX_LIST.filter((s) => !compact || !["hit", "block", "heal", "lose"].includes(s));
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((sfx) => (
        <button
          key={sfx}
          type="button"
          onClick={() => play(sfx, sfx === "chip" ? 3 : sfx === "combo" ? 8 : 0, voice)}
          className="press rounded-full bg-panel px-3 py-1.5 text-sm hover:bg-concrete"
        >
          {LABEL[sfx]}
        </button>
      ))}
      <button type="button" onClick={() => play("combo", 1, voice)} className="press rounded-full bg-panel px-3 py-1.5 text-sm hover:bg-concrete">
        Kombo kecil
      </button>
    </div>
  );
}

export default function SoundLab() {
  const demo = useDemo();
  const [unmuted, setUnmuted] = useState(false);

  // Browsers only start audio after a tap; make sure the lab isn't silently muted.
  function ensureSound() {
    if (!unmuted && isMuted()) setMuted(false);
    setUnmuted(true);
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-3 sm:p-5" onPointerDown={ensureSound}>
      <header className="flex items-center justify-between gap-2 rounded-full bg-panel p-1.5">
        <Link href="/" aria-label="Kembali ke menu">
          <Logo />
        </Link>
        <SoundToggle />
      </header>

      <section className="rounded-[28px] bg-paper p-5 sm:p-8">
        <h1 className="font-display text-2xl sm:text-3xl">Lab suara</h1>
        <p className="mt-2 text-base text-ink/70">
          Dengerin tiap suara satu per satu, atau putar demo satu ronde. Paling enak pakai headphone, atau naikin volume HP.
        </p>
      </section>

      <section className="rounded-[28px] bg-paper p-5 sm:p-8">
        <h2 className="font-display text-xl">Suara tiap skin</h2>
        <div className="mt-4 flex flex-col gap-4">
          {SKIN_IDS.map((id) => (
            <div key={id} className="flex flex-col gap-2 border-t border-ink/10 pt-4 first:border-0 first:pt-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display text-base">{SKINS[id].name}</p>
                <button type="button" onClick={() => demo(id)} className="press rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper">
                  Putar demo
                </button>
              </div>
              <SoundButtons voice={id} compact />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] bg-paper p-5 sm:p-8">
        <h2 className="font-display text-xl">Suara umum</h2>
        <p className="mt-1 text-sm text-ink/60">Sama di semua skin.</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(["hit", "block", "heal", "lose", "click", "connect"] as Sfx[]).map((sfx) => (
            <button key={sfx} type="button" onClick={() => play(sfx)} className="press rounded-full bg-panel px-3 py-1.5 text-sm hover:bg-concrete">
              {LABEL[sfx]}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
