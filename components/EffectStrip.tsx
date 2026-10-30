"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect } from "react";
import { EFFECTS, type EffectId } from "@/lib/effects";
import { play } from "@/lib/sound";

/**
 * This match's effect, always on screen. On round 1 it lands with a stamp so both
 * players notice it before they pick their first cards.
 */
export default function EffectStrip({ effect, fresh }: { effect: EffectId | undefined; fresh: boolean }) {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!effect || !fresh) return;
    const t = setTimeout(() => play("stamp"), 1150);
    return () => clearTimeout(t);
  }, [effect, fresh]);
  if (!effect) return null;
  const def = EFFECTS[effect];
  const animate = fresh && !reduce;
  return (
    <motion.div
      className="relative flex items-center gap-3 overflow-hidden rounded-[18px] bg-paper py-2 pr-4 pl-2 sm:rounded-[22px]"
      initial={animate ? { opacity: 0, transform: "translateY(-10px) scale(1.04)" } : false}
      animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1], delay: animate ? 1.1 : 0 }}
      role="note"
      aria-label={`Match effect: ${def.name}. ${def.description}.`}
    >
      {animate && (
        <motion.span
          className="pointer-events-none absolute inset-0 bg-signal"
          initial={{ opacity: 0.35 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.9, delay: 1.3 }}
          aria-hidden
        />
      )}
      <span className="relative shrink-0 rounded-full bg-signal px-2.5 py-1 font-display text-[10px] leading-none text-snow sm:text-xs">Match effect</span>
      <p className="relative min-w-0 text-sm leading-snug">
        <span className="font-display">{def.name}</span>
        <span className="text-ink/70"> · {def.description}</span>
      </p>
    </motion.div>
  );
}
