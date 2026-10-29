"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { JOKER_SLOTS, type PlayerState } from "@/lib/game";
import { JOKERS, type JokerId } from "@/lib/jokers";
import { play } from "@/lib/sound";
import { ArrowIcon, Pill, SecondaryButton } from "./ui";

interface Props {
  player: PlayerState;
  offers: JokerId[];
  done: boolean;
  opponentDone: boolean;
  onPick: (jokerId: JokerId | null, replaceIndex?: number) => void;
}

export default function JokerPicker({ player, offers, done, opponentDone, onPick }: Props) {
  const [chosen, setChosen] = useState<JokerId | null>(null);
  const full = player.jokers.length >= JOKER_SLOTS;

  useEffect(() => {
    const timers = offers.map((_, i) => setTimeout(() => play("flip"), 120 + i * 110));
    return () => timers.forEach(clearTimeout);
  }, [offers]);

  function pick(id: JokerId | null, replaceIndex?: number) {
    if (id) play("joker");
    onPick(id, replaceIndex);
  }

  if (done) {
    return (
      <section className="flex min-h-[340px] flex-col items-center justify-center gap-3 rounded-[28px] bg-ink p-6 text-center text-paper">
        <p className="font-display text-lg">Joker dipilih</p>
        <p className="flex items-center gap-2 text-sm text-paper/60">
          {!opponentDone && <span className="animate-pulse-dot size-1.5 rounded-full bg-signal" />}
          {opponentDone ? "Lanjut ke ronde berikutnya…" : "Nunggu lawan milih Joker…"}
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-5 rounded-[28px] bg-ink p-4 text-paper sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-xl sm:text-2xl">Pilih satu Joker</h2>
          <p className="mt-1 text-sm text-paper/60">
            {full ? "Slotmu penuh. Pilih Joker baru, lalu pilih yang mau diganti." : "Efeknya aktif mulai ronde depan, sampai game selesai."}
          </p>
        </div>
        <Pill tone="light">
          {player.jokers.length}/{JOKER_SLOTS} slot terisi
        </Pill>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {offers.map((id, i) => {
          const j = JOKERS[id];
          const isChosen = chosen === id;
          return (
            <motion.button
              key={id}
              type="button"
              initial={{ opacity: 0, transform: "perspective(700px) rotateY(80deg) translateY(16px)" }}
              animate={{
                opacity: chosen && !isChosen ? 0.5 : 1,
                transform: `perspective(700px) rotateY(0deg) translateY(${isChosen ? -6 : 0}px)`,
              }}
              transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1], delay: chosen ? 0 : 0.12 + i * 0.11 }}
              onClick={() => (full ? (play("select"), setChosen(id)) : pick(id))}
              className={`group relative flex items-center gap-4 overflow-hidden rounded-3xl bg-paper p-4 text-left text-ink sm:min-h-52 sm:flex-col sm:items-start sm:justify-between ${
                isChosen ? "shadow-[0_0_0_3px_var(--color-signal)]" : ""
              }`}
            >
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-panel text-3xl">{j.icon}</span>
              <span className="flex-1">
                <span className="block font-display text-sm">{j.name}</span>
                <span className="mt-1 block text-sm text-ink/65">{j.description}</span>
              </span>
              <span className="absolute top-3 right-3 grid size-8 place-items-center rounded-full bg-signal text-paper transition-transform duration-200 ease-[var(--ease-out)] [@media(hover:hover)]:group-hover:rotate-45">
                <ArrowIcon className="size-4" />
              </span>
            </motion.button>
          );
        })}
      </div>

      {full && chosen && (
        <motion.div
          initial={{ opacity: 0, transform: "translateY(8px)" }}
          animate={{ opacity: 1, transform: "translateY(0)" }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          className="flex flex-col items-center gap-2"
        >
          <p className="text-sm text-paper/70">Ganti yang mana dengan {JOKERS[chosen].name}?</p>
          <div className="flex flex-wrap justify-center gap-2">
            {player.jokers.map((id, i) => (
              <button
                key={id}
                type="button"
                onClick={() => pick(chosen, i)}
                className="press rounded-full bg-paper/10 px-4 py-2 text-sm ring-1 ring-paper/25 hover:bg-signal"
              >
                {JOKERS[id].icon} {JOKERS[id].name}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      <SecondaryButton onClick={() => pick(null)} className="self-center">
        Lewati, ga ambil Joker
      </SecondaryButton>
    </section>
  );
}
