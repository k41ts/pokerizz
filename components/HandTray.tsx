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
    <section className="rounded-[28px] bg-paper p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-h-12">
          <AnimatePresence mode="wait" initial={false}>
            {score ? (
              <motion.div
                key={score.hand}
                initial={{ opacity: 0, transform: "translateY(6px)" }}
                animate={{ opacity: 1, transform: "translateY(0)" }}
                exit={{ opacity: 0, transform: "translateY(-6px)" }}
                transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              >
                <p className="font-display text-base">{HAND_INFO[score.hand].label}</p>
                <p className="text-sm text-steel tabular-nums">
                  {score.base} kombinasi + {score.chips} kartu
                  {score.bonuses.map((b) => ` + ${b.amount} ${JOKERS[b.jokerId].icon}`).join("")}
                  {score.multiplier !== 1 && ` × ${score.multiplier}`}
                </p>
              </motion.div>
            ) : (
              <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-60 text-base text-ink/70">
                Ketuk 1–{MAX_SELECT} kartu buat main atau buang.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-sm text-steel">
            {sel.length}/{MAX_SELECT} kartu
          </span>
          <span className="font-display text-4xl">
            <AnimatedNumber value={score?.total ?? 0} />
          </span>
        </div>
      </div>

      {!isBest && (
        <button
          type="button"
          onClick={pickBest}
          className="press mb-2 flex w-full items-center justify-between gap-3 rounded-2xl bg-panel px-4 py-3 text-left hover:bg-concrete/60"
        >
          <span className="text-sm sm:text-base">
            <span className="text-ink/60">Kombinasi terbaikmu: </span>
            <strong>{HAND_INFO[best.score.hand].label}</strong> <span className="text-ink/60">({best.score.total} poin)</span>
          </span>
          <span className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-sm font-semibold text-paper">Pilihin</span>
        </button>
      )}

      <div className="grid grid-cols-4 gap-2.5 pt-4 sm:grid-cols-8 sm:gap-2">
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

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <SecondaryButton onClick={() => setSortBy(sortBy === "rank" ? "suit" : "rank")}>
          Urut: {sortBy === "rank" ? "Angka" : "Simbol"}
        </SecondaryButton>
        <div className="flex gap-2">
          <SecondaryButton
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
