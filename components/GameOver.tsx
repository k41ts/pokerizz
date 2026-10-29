"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo } from "react";
import { createRng, type Card } from "@/lib/cards";
import { play } from "@/lib/sound";
import { useSkin } from "@/lib/skins";
import CardArt from "./CardArt";
import { WIN_THEME, WinScene } from "./SkinFx";
import type { RankNote } from "./Game";
import { PrimaryButton, SecondaryButton } from "./ui";

interface Props {
  outcome: "win" | "lose" | "draw";
  round: number;
  hp: [number, number];
  onRestart: () => void;
  onExit: () => void;
  restartLabel: string;
  rankNote: RankNote | null;
  /** The winning hand, fanned out behind the title. */
  playedCards: Card[];
}

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

function Shards({ dark }: { dark: boolean }) {
  const shards = useMemo(() => {
    const rng = createRng(dark ? 11 : 29);
    return Array.from({ length: 40 }, (_, i) => {
      const angle = (i / 40) * Math.PI * 2 + rng.next() * 0.3;
      const dist = 180 + rng.next() * 320;
      return {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        r: rng.next() * 720 - 360,
        w: 8 + rng.next() * 18,
        tone: i % 3,
      };
    });
  }, [dark]);
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
      {shards.map((s, i) => (
        <motion.span
          key={i}
          className={`absolute h-3 rounded-sm ${s.tone === 0 ? "bg-paper" : dark ? "bg-ink" : "bg-signal"}`}
          style={{ width: s.w }}
          initial={{ opacity: 1, transform: "translate(0px, 0px) rotate(0deg)" }}
          animate={{ opacity: 0, transform: `translate(${s.x}px, ${s.y}px) rotate(${s.r}deg)` }}
          transition={{ duration: 1.6, ease: EASE_OUT, delay: 0.35 }}
        />
      ))}
    </div>
  );
}

function Letters({ text, delay }: { text: string; delay: number }) {
  const reduce = useReducedMotion();
  return (
    <h2 className="flex justify-center font-display text-[clamp(2.6rem,13vw,7.5rem)] leading-none" aria-label={text}>
      {[...text].map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="inline-block"
          initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(-120%) rotate(-18deg) scale(1.3)" }}
          animate={{ opacity: 1, transform: "translateY(0%) rotate(0deg) scale(1)" }}
          transition={reduce ? { duration: 0.2, delay } : { type: "spring", duration: 0.6, bounce: 0.35, delay: delay + i * 0.06 }}
        >
          {ch}
        </motion.span>
      ))}
    </h2>
  );
}

export default function GameOver({ outcome, round, hp, onRestart, onExit, restartLabel, rankNote, playedCards }: Props) {
  const reduce = useReducedMotion();
  const win = outcome === "win";
  // When you win, the screen is dressed in your skin. Only you see it.
  const skin = useSkin();
  const theme = WIN_THEME[skin.id];

  useEffect(() => {
    const timers = [setTimeout(() => play(win ? "win" : outcome === "lose" ? "lose" : "block"), 450)];
    if (rankNote?.kind === "star") timers.push(setTimeout(() => play("joker"), 1500));
    return () => timers.forEach(clearTimeout);
  }, [win, outcome, rankNote]);

  const title = win ? "MENANG" : outcome === "lose" ? "KALAH" : "SERI";
  const fan = playedCards.slice(0, 5);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={win ? "Kamu menang" : outcome === "lose" ? "Kamu kalah" : "Seri"}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden p-6 text-center ${
        win ? "" : "bg-concrete/90 text-ink backdrop-blur-md backdrop-grayscale"
      }`}
      style={win ? { background: theme.bg, color: theme.text } : undefined}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, delay: 0.3 }}
    >
      {win && <WinScene skin={skin} />}
      {!reduce && outcome === "lose" && <Shards dark={false} />}

      {fan.length > 0 && (
        <div className="relative mb-2 h-32 w-full max-w-sm sm:h-40" aria-hidden>
          {fan.map((c, i) => {
            const offset = i - (fan.length - 1) / 2;
            return (
              <motion.div
                key={c.id}
                className="absolute bottom-0 left-1/2 w-20 origin-bottom drop-shadow-[0_14px_18px_rgba(0,0,0,0.35)] sm:w-24"
                initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateX(-50%) translateY(140%) rotate(0deg)" }}
                animate={{
                  opacity: outcome === "lose" ? 0.6 : 1,
                  transform: `translateX(calc(-50% + ${offset * 46}px)) translateY(${Math.abs(offset) * 8}px) rotate(${offset * 10}deg)`,
                }}
                transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.9 + i * 0.07 }}
              >
                <CardArt card={c} />
              </motion.div>
            );
          })}
        </div>
      )}

      <motion.div
        className="relative"
        animate={outcome === "lose" && !reduce ? { transform: ["translateX(0px)", "translateX(-10px)", "translateX(8px)", "translateX(-4px)", "translateX(0px)"] } : undefined}
        transition={{ duration: 0.45, delay: 1.0 }}
      >
        <div style={win && skin.id === "neon" ? { textShadow: "0 0 18px #22d3ee, 0 0 42px #f472b6" } : undefined}>
          <Letters text={title} delay={0.45} />
        </div>
        {outcome === "lose" && !reduce && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden>
            <motion.path
              d="M2 12 L22 16 L30 9 L46 18 L58 11 L71 19 L84 10 L98 15"
              fill="none"
              stroke="var(--color-signal)"
              strokeWidth={0.8}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.35, delay: 1.0, ease: "linear" }}
            />
          </svg>
        )}
      </motion.div>

      <motion.p
        className={`relative mt-4 text-base ${win ? "" : "text-ink/70"}`}
        style={win ? { color: theme.muted } : undefined}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 1.2 }}
      >
        Selesai di ronde {round}. HP akhir: kamu {hp[0]}, lawan {hp[1]}.
      </motion.p>

      {rankNote && (
        <motion.p
          className={`relative mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
            rankNote.kind === "star" ? "bg-paper text-ink" : win ? "bg-ink/20" : "bg-paper"
          }`}
          initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "scale(0.6) rotate(-10deg)" }}
          animate={{ opacity: 1, transform: "scale(1) rotate(0deg)" }}
          transition={reduce ? { duration: 0.2, delay: 1.4 } : { type: "spring", duration: 0.5, bounce: 0.45, delay: 1.4 }}
        >
          {rankNote.kind === "star" && <span className="text-xl text-signal">★</span>}
          {rankNote.text}
        </motion.p>
      )}

      <motion.div
        className="relative mt-7 flex flex-wrap justify-center gap-2"
        initial={{ opacity: 0, transform: "translateY(10px)" }}
        animate={{ opacity: 1, transform: "translateY(0px)" }}
        transition={{ duration: 0.35, ease: EASE_OUT, delay: 1.6 }}
      >
        <PrimaryButton autoFocus tone={win ? theme.button : "dark"} onClick={onRestart} className="px-6 text-base">
          {restartLabel}
        </PrimaryButton>
        <SecondaryButton onClick={onExit} className="text-base">
          Ke menu
        </SecondaryButton>
      </motion.div>
    </motion.div>
  );
}
