"use client";

import { motion, useReducedMotion } from "motion/react";

export type CalloutKind = "shutdown" | "legendary" | "comeback";

const LOOK: Record<CalloutKind, { title: string; strip: string; text: string }> = {
  shutdown: { title: "SHUTDOWN", strip: "bg-snow", text: "text-signal" },
  legendary: {
    title: "LEGENDARY",
    strip: "bg-black",
    text: "bg-[linear-gradient(100deg,#b8860b,#ffe27a_40%,#fff6cf_50%,#ffe27a_60%,#b8860b)] bg-clip-text text-transparent",
  },
  comeback: {
    title: "EPIC COMEBACK",
    strip: "bg-black",
    text: "bg-[linear-gradient(100deg,#ff2a1f,#ffb03a_50%,#ff2a1f)] bg-clip-text text-transparent",
  },
};

/** A title slammed onto a skewed strip: the moment a streak breaks or a match ends in style. */
export default function Callout({ kind, detail, className = "" }: { kind: CalloutKind; detail: string; className?: string }) {
  const reduce = useReducedMotion();
  const look = LOOK[kind];
  return (
    <div className={`pointer-events-none flex w-full flex-col items-center ${className}`} role="status">
      <motion.div
        className={`relative w-max px-8 py-3 text-center ${look.strip}`}
        initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "scaleX(0.2) skewX(-14deg)" }}
        animate={{ opacity: 1, transform: "scaleX(1) skewX(-8deg)" }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      >
        <motion.p
          className={`whitespace-nowrap font-display text-[clamp(1.15rem,4.8vw,2.6rem)] leading-tight tracking-wide ${look.text}`}
          initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "scale(1.8) skewX(8deg)" }}
          animate={{ opacity: 1, transform: "scale(1) skewX(8deg)" }}
          transition={reduce ? { duration: 0.2 } : { type: "spring", duration: 0.45, bounce: 0.35, delay: 0.12 }}
        >
          {look.title}
        </motion.p>
      </motion.div>
      <motion.p
        className="mt-2 rounded-full bg-black/70 px-3.5 py-1 text-sm font-semibold text-snow"
        initial={{ opacity: 0, transform: "translateY(-6px)" }}
        animate={{ opacity: 1, transform: "translateY(0px)" }}
        transition={{ duration: 0.25, delay: 0.35 }}
      >
        {detail}
      </motion.p>
    </div>
  );
}
