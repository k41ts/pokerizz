"use client";

import { AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { SUITS, sortHand, type Card } from "@/lib/cards";
import { MAX_SELECT, type PlayerState } from "@/lib/game";
import { play } from "@/lib/sound";
import PlayingCard from "./PlayingCard";
import { PrimaryButton, SecondaryButton } from "./ui";

interface Props {
  player: PlayerState;
  onDiscard: (cardIds: string[]) => void;
  onPlay: (cardIds: string[]) => void;
  /** Countdown for this turn; when it ends the selected cards are played (or one random card). */
  turnSeconds?: number;
}

/** The round banner covers the first second, so the clock starts after it. */
const BANNER_MS = 1000;

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

/** Seconds left, ticking down; calls onExpire once at zero. */
function useCountdown(seconds: number | undefined, onExpire: () => void) {
  const [left, setLeft] = useState(seconds ?? 0);
  const expire = useRef(onExpire);
  useEffect(() => {
    expire.current = onExpire;
  });
  useEffect(() => {
    if (!seconds) return;
    const end = Date.now() + BANNER_MS + seconds * 1000;
    let last = seconds;
    const t = setInterval(() => {
      const now = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      if (now !== last) {
        last = now;
        setLeft(Math.min(seconds, now));
        if (now > 0 && now <= 3) play("click");
      }
      if (now === 0) {
        clearInterval(t);
        expire.current();
      }
    }, 100);
    return () => clearInterval(t);
  }, [seconds]);
  return left;
}

export default function HandTray({ player, onDiscard, onPlay, turnSeconds }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"rank" | "suit">("rank");
  useDealSound(player.hand);

  const sel = selected.filter((id) => player.hand.some((c) => c.id === id));
  const cards = sortBy === "rank" ? sortHand(player.hand) : sortBySuit(player.hand);

  const left = useCountdown(turnSeconds, () => {
    // Out of time: play what's selected, or one random card.
    const ids = sel.length > 0 ? sel : [player.hand[Math.floor(Math.random() * player.hand.length)].id];
    play("play");
    onPlay(ids);
  });
  const urgent = !!turnSeconds && left <= 3;

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
    <section className="relative overflow-hidden rounded-[22px] bg-paper p-3 pb-0 sm:rounded-[28px] sm:p-5">
      {turnSeconds && (
        <div className="absolute inset-x-0 top-0 h-1.5 bg-panel" aria-hidden>
          <div
            className={`h-full origin-left ${urgent ? "bg-signal" : "bg-ink"}`}
            style={{ animation: `countdown ${turnSeconds}s linear ${BANNER_MS}ms both` }}
          />
        </div>
      )}
      <div className="mb-2 flex items-center justify-between gap-2 sm:mb-4 sm:gap-3">
        <p className="text-sm text-ink/70 sm:text-base">
          Pilih 1–{MAX_SELECT} kartu. <span className="font-semibold text-ink">{sel.length} dipilih</span>
        </p>
        {turnSeconds && (
          <p
            className={`flex shrink-0 items-baseline gap-1 font-display tabular-nums ${urgent ? "animate-pulse-dot text-signal" : ""}`}
            role="timer"
            aria-live="off"
            aria-label={`${left} detik lagi`}
          >
            <span className="text-3xl sm:text-4xl">{left}</span>
            <span className="text-sm">dtk</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2.5 pt-3 sm:grid-cols-8 sm:gap-2 sm:pt-4">
        <AnimatePresence mode="popLayout">
          {cards.map((c, i) => (
            <PlayingCard key={c.id} layoutId={c.id} card={c} index={i} selected={sel.includes(c.id)} onClick={() => toggle(c.id)} />
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
