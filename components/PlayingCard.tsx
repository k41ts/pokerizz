"use client";

import { motion, useReducedMotion } from "motion/react";
import { rankLabel, SUIT_SYMBOL, type Card } from "@/lib/cards";
import CardArt from "./CardArt";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

interface Props {
  card?: Card;
  /** Shows the back; flipping this animates a 3D turn. */
  faceDown?: boolean;
  selected?: boolean;
  /** Raised and outlined while it scores during the reveal. */
  scoring?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  /** Lets the card fly between hand and table. */
  layoutId?: string;
  index?: number;
  className?: string;
}

export default function PlayingCard({
  card,
  faceDown,
  selected,
  scoring,
  dimmed,
  onClick,
  layoutId,
  index = 0,
  className = "",
}: Props) {
  const reduce = useReducedMotion();
  const label = card && card.rank > 0 ? `${rankLabel(card.rank)}${SUIT_SYMBOL[card.suit]}` : "Kartu tertutup";
  const lift = selected ? -14 : scoring ? -10 : 0;

  const inner = (
    <motion.div
      className="relative h-full w-full [transform-style:preserve-3d]"
      initial={false}
      animate={{ transform: `rotateY(${faceDown ? 180 : 0}deg)` }}
      transition={reduce ? { duration: 0 } : { duration: 0.45, ease: EASE_OUT }}
    >
      <div className="absolute inset-0 [backface-visibility:hidden]">
        <CardArt card={card} />
      </div>
      <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
        <CardArt faceDown />
      </div>
    </motion.div>
  );

  const shell = `relative aspect-[5/7] select-none rounded-[9%] [perspective:600px] ${className}`;
  const ring = selected
    ? "shadow-[0_0_0_3px_var(--color-signal),0_14px_24px_-8px_rgba(0,0,0,0.45)]"
    : scoring
      ? "shadow-[0_0_0_3px_var(--color-signal),0_0_24px_rgba(255,42,31,0.55)]"
      : "shadow-[0_6px_14px_-6px_rgba(0,0,0,0.35)]";

  const motionProps = {
    layoutId,
    initial: reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(36px) rotate(-6deg) scale(0.92)" },
    animate: {
      opacity: dimmed ? 0.45 : 1,
      transform: `translateY(${reduce ? 0 : lift}px) rotate(0deg) scale(1)`,
    },
    exit: reduce
      ? { opacity: 0 }
      : { opacity: 0, transform: "translateY(-70px) rotate(14deg) scale(0.9)", transition: { duration: 0.24, ease: EASE_OUT } },
    transition: {
      duration: 0.36,
      ease: EASE_OUT,
      delay: index * 0.045,
      layout: { duration: 0.42, ease: EASE_OUT },
    },
  };

  if (onClick) {
    return (
      <motion.button
        type="button"
        {...motionProps}
        onClick={onClick}
        aria-pressed={selected}
        aria-label={label}
        className={`${shell} ${ring} transition-shadow duration-150 [@media(hover:hover)]:hover:shadow-[0_0_0_2px_var(--color-ink),0_10px_18px_-8px_rgba(0,0,0,0.4)]`}
      >
        {inner}
      </motion.button>
    );
  }
  return (
    <motion.div {...motionProps} aria-label={label} role="img" className={`${shell} ${ring} transition-shadow duration-200`}>
      {inner}
    </motion.div>
  );
}
