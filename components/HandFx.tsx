"use client";

import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";
import { createRng, RED_SUITS, SUITS, type Suit } from "@/lib/cards";
import { HAND_INFO, type HandType } from "@/lib/hands";
import { SuitGlyph } from "./CardArt";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** How long the reveal pauses for each hand's effect, in ms. */
export const FX_HOLD: Record<HandType, number> = {
  high_card: 0,
  pair: 350,
  two_pair: 450,
  three_kind: 650,
  straight: 800,
  flush: 1000,
  full_house: 1000,
  four_kind: 1200,
  straight_flush: 1500,
};

function color(suit: Suit) {
  return RED_SUITS.includes(suit) ? "#ff2a1f" : "#ffffff";
}

function Glyph({ suit, size }: { suit: Suit; size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className="drop-shadow-[0_6px_14px_rgba(0,0,0,0.45)]">
      <SuitGlyph suit={suit} x={12} y={12} size={22} color={color(suit)} />
    </svg>
  );
}

/** Small glyphs flying out from the center. */
function Burst({ suit, count, spread }: { suit: Suit; count: number; spread: number }) {
  const parts = useMemo(() => {
    const rng = createRng(count * 7 + spread);
    return Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + rng.next() * 0.4;
      const d = spread * (0.6 + rng.next() * 0.6);
      return { x: Math.cos(a) * d, y: Math.sin(a) * d, r: rng.next() * 360 - 180, s: 18 + rng.next() * 22, delay: rng.next() * 0.12 };
    });
  }, [count, spread]);
  return (
    <>
      {parts.map((p, i) => (
        <motion.div
          key={i}
          className="absolute"
          initial={{ opacity: 1, transform: "translate(0px, 0px) rotate(0deg) scale(0.4)" }}
          animate={{ opacity: 0, transform: `translate(${p.x}px, ${p.y}px) rotate(${p.r}deg) scale(1)` }}
          transition={{ duration: 1.1, ease: EASE_OUT, delay: 0.1 + p.delay }}
        >
          <Glyph suit={suit} size={p.s} />
        </motion.div>
      ))}
    </>
  );
}

/** Big suit that beats like a heart: two quick pulses, then fades. */
function Pulse({ suit, size }: { suit: Suit; size: number }) {
  return (
    <motion.div
      className="absolute"
      initial={{ opacity: 0, transform: "scale(0.3)" }}
      animate={{
        opacity: [0, 1, 1, 1, 1, 0],
        transform: ["scale(0.3)", "scale(1.15)", "scale(0.95)", "scale(1.25)", "scale(1)", "scale(1.4)"],
      }}
      transition={{ duration: 1.3, times: [0, 0.18, 0.32, 0.46, 0.7, 1], ease: "easeOut" }}
    >
      <Glyph suit={suit} size={size} />
    </motion.div>
  );
}

/** Horizontal speed streaks sweeping across, for straights. */
function Streaks() {
  return (
    <>
      {[-90, -45, 0, 45, 90].map((y, i) => (
        <motion.div
          key={y}
          className="absolute h-1.5 w-[60vw] rounded-full bg-gradient-to-r from-transparent via-paper to-signal"
          style={{ top: `calc(50% + ${y}px)` }}
          initial={{ opacity: 0, transform: "translateX(-120vw)" }}
          animate={{ opacity: [0, 1, 0], transform: "translateX(120vw)" }}
          transition={{ duration: 0.7, ease: "easeInOut", delay: i * 0.06 }}
        />
      ))}
    </>
  );
}

/** Glyphs dropping into place in rows, e.g. [3, 2] for a full house. */
function Rows({ suits, rows }: { suits: Suit[]; rows: number[] }) {
  let k = 0;
  return (
    <div className="absolute flex flex-col items-center gap-2">
      {rows.map((n, r) => (
        <div key={r} className="flex gap-2">
          {Array.from({ length: n }, (_, i) => {
            const idx = k++;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, transform: "translateY(-160px) rotate(-25deg) scale(1.4)" }}
                animate={{ opacity: [0, 1, 1, 0], transform: ["translateY(-160px) rotate(-25deg) scale(1.4)", "translateY(0px) rotate(0deg) scale(1)", "translateY(0px) rotate(0deg) scale(1)", "translateY(0px) rotate(0deg) scale(1.1)"] }}
                transition={{ duration: 1.2, times: [0, 0.25, 0.8, 1], ease: EASE_OUT, delay: idx * 0.08 }}
              >
                <Glyph suit={suits[idx % suits.length]} size={56} />
              </motion.div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** All four suits orbiting the center, for four of a kind. */
function Orbit() {
  return (
    <motion.div
      className="absolute size-56"
      initial={{ opacity: 0, transform: "rotate(0deg) scale(0.5)" }}
      animate={{ opacity: [0, 1, 1, 0], transform: ["rotate(0deg) scale(0.5)", "rotate(180deg) scale(1)", "rotate(360deg) scale(1)", "rotate(450deg) scale(1.3)"] }}
      transition={{ duration: 1.4, times: [0, 0.3, 0.8, 1], ease: "easeInOut" }}
    >
      {SUITS.map((s, i) => {
        const a = (i / 4) * Math.PI * 2;
        return (
          <div key={s} className="absolute top-1/2 left-1/2" style={{ transform: `translate(calc(-50% + ${Math.cos(a) * 96}px), calc(-50% + ${Math.sin(a) * 96}px))` }}>
            <Glyph suit={s} size={52} />
          </div>
        );
      })}
    </motion.div>
  );
}

interface Props {
  hand: HandType;
  suit: Suit;
  /** Changes for each new effect so it replays. */
  id: number;
}

/** Full-screen flourish when a combination is revealed. Pointer-transparent, never blocks input. */
export default function HandFx({ hand, suit, id }: Props) {
  const reduce = useReducedMotion();
  if (hand === "high_card") return null;
  const big = FX_HOLD[hand] >= 1000;

  return (
    <div key={id} className="pointer-events-none fixed inset-0 z-40 grid place-items-center overflow-hidden" aria-hidden>
      {big && !reduce && (
        <motion.div
          className="absolute inset-0 bg-signal"
          initial={{ opacity: 0.35 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
        />
      )}
      {!reduce && (
        <>
          {(hand === "straight" || hand === "straight_flush") && <Streaks />}
          {(hand === "flush" || hand === "straight_flush") && (
            <>
              <Pulse suit={suit} size={hand === "straight_flush" ? 220 : 180} />
              <Burst suit={suit} count={hand === "straight_flush" ? 28 : 20} spread={320} />
            </>
          )}
          {hand === "pair" && <Rows suits={[suit]} rows={[2]} />}
          {hand === "two_pair" && <Rows suits={[suit]} rows={[2, 2]} />}
          {hand === "three_kind" && (
            <>
              <Rows suits={[suit]} rows={[3]} />
              <Burst suit={suit} count={10} spread={200} />
            </>
          )}
          {hand === "full_house" && (
            <>
              <Rows suits={["S", "H", "D", "C", "S"]} rows={[3, 2]} />
              <Burst suit={suit} count={14} spread={260} />
            </>
          )}
          {hand === "four_kind" && (
            <>
              <Orbit />
              <Burst suit={suit} count={20} spread={300} />
            </>
          )}
        </>
      )}
      <motion.p
        className={`absolute bottom-[18%] rounded-full px-6 py-2 font-display text-paper ${big ? "bg-signal text-3xl sm:text-5xl" : "bg-ink text-xl sm:text-3xl"}`}
        initial={{ opacity: 0, transform: "scale(1.6) rotate(-6deg)" }}
        animate={{ opacity: [0, 1, 1, 0], transform: ["scale(1.6) rotate(-6deg)", "scale(1) rotate(-2deg)", "scale(1) rotate(-2deg)", "scale(0.95) rotate(-2deg)"] }}
        transition={{ duration: Math.max(0.9, FX_HOLD[hand] / 1000 + 0.4), times: [0, 0.2, 0.8, 1], ease: EASE_OUT }}
      >
        {HAND_INFO[hand].label}!
      </motion.p>
    </div>
  );
}
