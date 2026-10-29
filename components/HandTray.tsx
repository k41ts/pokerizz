"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SUITS, sortHand, type Card } from "@/lib/cards";
import { chooseBestPlay } from "@/lib/bot";
import { MAX_SELECT, type PlayerState } from "@/lib/game";
import { HAND_INFO } from "@/lib/hands";
import { JOKERS } from "@/lib/jokers";
import { scorePlay } from "@/lib/scoring";
import { play } from "@/lib/sound";
import PlayingCard from "./PlayingCard";
import { AnimatedNumber, PrimaryButton, SecondaryButton } from "./ui";

interface Props {
  player: PlayerState;
  onDiscard: (cardIds: string[]) => void;
  onPlay: (cardIds: string[]) => void;
}

function sortBySuit(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit) || b.rank - a.rank);
}

/** Plays a soft deal tick for each card that just arrived in the hand. */
function useDealSound(hand: Card[]) {
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const prev = seen.current;
    seen.current = new Set(hand.map((c) => c.id));
    const fresh = prev ? hand.filter((c) => !prev.has(c.id)).length : hand.length;
    const timers = Array.from({ length: fresh }, (_, i) => setTimeout(() => play("deal"), 60 + i * 55));
    return () => timers.forEach(clearTimeout);
  }, [hand]);
}

export default function HandTray({ player, onDiscard, onPlay }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"rank" | "suit">("rank");
  useDealSound(player.hand);

  const sel = selected.filter((id) => player.hand.some((c) => c.id === id));
  const selectedCards = player.hand.filter((c) => sel.includes(c.id));
  const score = selectedCards.length > 0 ? scorePlay(selectedCards, player.jokers) : null;
  const cards = sortBy === "rank" ? sortHand(player.hand) : sortBySuit(player.hand);
  const best = useMemo(() => chooseBestPlay(player.hand, player.jokers), [player.hand, player.jokers]);
  const isBest = sel.length === best.cards.length && best.cards.every((c) => sel.includes(c.id));

  function pickBest() {
    play("select");
    setSelected(best.cards.map((c) => c.id));
  }

  function toggle(id: string) {
    const on = sel.includes(id);
    if (!on && sel.length >= MAX_SELECT) return;
    play(on ? "deselect" : "select");
    setSelected((prev) => {
      const current = prev.filter((s) => player.hand.some((c) => c.id === s));
      if (current.includes(id)) return current.filter((s) => s !== id);
      return current.length < MAX_SELECT ? [...current, id] : current;
    });
  }

  return (
    <section className="rounded-[22px] bg-paper p-3 pb-0 sm:rounded-[28px] sm:p-5">
      <div className="mb-2 flex items-center justify-between gap-2 sm:mb-4 sm:gap-3">
        <div className="min-h-10 min-w-0 sm:min-h-12">
          <AnimatePresence mode="wait" initial={false}>
            {score ? (
              <motion.div
                key={score.hand}
                initial={{ opacity: 0, transform: "translateY(6px)" }}
                animate={{ opacity: 1, transform: "translateY(0)" }}
                exit={{ opacity: 0, transform: "translateY(-6px)" }}
                transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              >
                <p className="font-display text-sm sm:text-base">{HAND_INFO[score.hand].label}</p>
                <p className="text-xs text-steel tabular-nums sm:text-sm">
                  {score.base} kombinasi + {score.chips} kartu
                  {score.bonuses.map((b) => ` + ${b.amount} ${JOKERS[b.jokerId].icon}`).join("")}
                  {score.multiplier !== 1 && ` × ${score.multiplier}`}
                </p>
              </motion.div>
            ) : (
              <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm text-ink/70 sm:text-base">
                Ketuk 1–{MAX_SELECT} kartu<span className="max-sm:hidden"> buat main atau buang</span>.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        <div className="flex shrink-0 items-baseline gap-2">
          <span className="text-sm text-steel max-sm:hidden">
            {sel.length}/{MAX_SELECT} kartu
          </span>
          <span className="font-display text-3xl sm:text-4xl">
            <AnimatedNumber value={score?.total ?? 0} />
          </span>
        </div>
      </div>

      {!isBest && (
        <button
          type="button"
          onClick={pickBest}
          className="press mb-1 flex w-full items-center justify-between gap-3 rounded-2xl bg-panel px-3 py-2 text-left hover:bg-concrete/60 sm:mb-2 sm:px-4 sm:py-3"
        >
          <span className="text-sm sm:text-base">
            <span className="text-ink/60">Kombinasi terbaikmu: </span>
            <strong>{HAND_INFO[best.score.hand].label}</strong> <span className="text-ink/60">({best.score.total} poin)</span>
          </span>
          <span className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-sm font-semibold text-paper">Pilihin</span>
        </button>
      )}

      <div className="grid grid-cols-4 gap-2.5 pt-3 sm:grid-cols-8 sm:gap-2 sm:pt-4">
        <AnimatePresence mode="popLayout">
          {cards.map((c, i) => (
            <PlayingCard
              key={c.id}
              layoutId={c.id}
              card={c}
              index={i}
              selected={sel.includes(c.id)}
              onClick={() => toggle(c.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      <div className="sticky bottom-0 z-20 -mx-3 mt-3 flex items-center justify-between gap-2 rounded-b-[22px] bg-paper/95 px-3 py-3 backdrop-blur sm:static sm:mx-0 sm:mt-4 sm:flex-wrap sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <SecondaryButton onClick={() => setSortBy(sortBy === "rank" ? "suit" : "rank")} className="whitespace-nowrap max-sm:px-3.5">
          <span className="max-sm:hidden">Urut: </span>
          {sortBy === "rank" ? "Angka" : "Simbol"}
        </SecondaryButton>
        <div className="flex gap-2">
          <SecondaryButton
            className="whitespace-nowrap max-sm:px-3.5"
            disabled={sel.length === 0 || player.discardsLeft <= 0}
            onClick={() => {
              play("discard");
              onDiscard(sel);
              setSelected([]);
            }}
          >
            Buang ({player.discardsLeft})
          </SecondaryButton>
          <PrimaryButton
            tone="red"
            className="whitespace-nowrap"
            disabled={sel.length === 0}
            onClick={() => {
              play("play");
              onPlay(sel);
            }}
          >
            Main
          </PrimaryButton>
        </div>
      </div>
    </section>
  );
}
