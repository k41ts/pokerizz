"use client";

import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";
import { createRng } from "@/lib/cards";
import type { Skin, SkinId } from "@/lib/skins";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** How the win screen looks for each skin. */
export const WIN_THEME: Record<SkinId, { bg: string; text: string; muted: string; button: "dark" | "red" }> = {
  classic: { bg: "#ff2a1f", text: "#ffffff", muted: "rgba(255,255,255,0.85)", button: "dark" },
  blueprint: { bg: "#1d4ed8", text: "#ffffff", muted: "rgba(255,255,255,0.8)", button: "dark" },
  sakura: { bg: "#fbcfe8", text: "#831843", muted: "rgba(131,24,67,0.8)", button: "red" },
  neon: { bg: "#05050c", text: "#22d3ee", muted: "rgba(244,114,182,0.9)", button: "red" },
  gold: { bg: "#1a1408", text: "#f5d77a", muted: "rgba(245,215,122,0.8)", button: "red" },
  void: { bg: "#000000", text: "#ffffff", muted: "rgba(255,255,255,0.7)", button: "red" },
};

function useParticles(seed: number, count: number) {
  return useMemo(() => {
    const rng = createRng(seed);
    return Array.from({ length: count }, (_, i) => ({
      i,
      a: (i / count) * Math.PI * 2 + rng.next() * 0.5,
      r: rng.next(),
      s: rng.next(),
      t: rng.next(),
    }));
  }, [seed, count]);
}

/* ---------- Play burst: a one-shot flourish when you lock in your cards ---------- */

function Shards({ colors, count = 22, spread = 260 }: { colors: string[]; count?: number; spread?: number }) {
  const parts = useParticles(count * 3, count);
  return (
    <>
      {parts.map((p) => (
        <motion.span
          key={p.i}
          className="absolute h-2.5 rounded-sm"
          style={{ width: 6 + p.s * 14, background: colors[p.i % colors.length] }}
          initial={{ opacity: 1, transform: "translate(0px,0px) rotate(0deg)" }}
          animate={{ opacity: 0, transform: `translate(${Math.cos(p.a) * spread * (0.5 + p.r)}px, ${Math.sin(p.a) * spread * (0.5 + p.r)}px) rotate(${p.t * 540 - 270}deg)` }}
          transition={{ duration: 0.9, ease: EASE_OUT }}
        />
      ))}
    </>
  );
}

function Petals({ count, spread, rain }: { count: number; spread: number; rain?: boolean }) {
  const parts = useParticles(count * 5, count);
  return (
    <>
      {parts.map((p) => {
        const x = rain ? (p.r - 0.5) * 110 : Math.cos(p.a) * spread * (0.4 + p.r);
        const y = rain ? 0 : Math.sin(p.a) * spread * (0.4 + p.r);
        return (
          <motion.span
            key={p.i}
            className="absolute rounded-[60%_10%]"
            style={{
              width: 10 + p.s * 10,
              height: 7 + p.s * 6,
              background: p.i % 3 === 0 ? "#f9a8d4" : p.i % 3 === 1 ? "#fbcfe8" : "#e11d74",
              left: rain ? `${50 + x}%` : undefined,
              top: rain ? "-5%" : undefined,
            }}
            initial={rain ? { transform: "translate(0,0) rotate(0deg)" } : { opacity: 1, transform: "translate(0px,0px) rotate(0deg)" }}
            animate={
              rain
                ? { transform: [`translate(0vw, 0vh) rotate(0deg)`, `translate(${(p.t - 0.5) * 20}vw, 110vh) rotate(${360 + p.t * 360}deg)`] }
                : { opacity: 0, transform: `translate(${x}px, ${y + 80}px) rotate(${p.t * 400}deg)` }
            }
            transition={rain ? { duration: 4 + p.s * 3, repeat: Infinity, delay: p.t * 4, ease: "linear" } : { duration: 1.2, ease: EASE_OUT }}
          />
        );
      })}
    </>
  );
}

function Rings({ colors, repeat }: { colors: string[]; repeat?: boolean }) {
  return (
    <>
      {colors.map((c, i) => (
        <motion.span
          key={i}
          className="absolute size-40 rounded-full"
          style={{ border: `3px solid ${c}`, boxShadow: `0 0 24px ${c}, inset 0 0 24px ${c}` }}
          initial={{ opacity: 0.9, transform: "scale(0.2)" }}
          animate={{ opacity: 0, transform: `scale(${repeat ? 4 : 2.6})` }}
          transition={{ duration: repeat ? 2.4 : 0.8, ease: EASE_OUT, delay: i * (repeat ? 0.8 : 0.12), repeat: repeat ? Infinity : 0 }}
        />
      ))}
    </>
  );
}

function Coins({ count, spread, rain }: { count: number; spread: number; rain?: boolean }) {
  const parts = useParticles(count * 7, count);
  return (
    <>
      {parts.map((p) => (
        <motion.span
          key={p.i}
          className="absolute grid place-items-center rounded-full text-[10px] font-bold"
          style={{
            width: 18 + p.s * 10,
            height: 18 + p.s * 10,
            background: "radial-gradient(circle at 35% 30%, #fff3b0, #d4a537 55%, #8a6414)",
            color: "#8a6414",
            left: rain ? `${p.r * 100}%` : undefined,
            top: rain ? "-6%" : undefined,
          }}
          initial={rain ? { transform: "translateY(0vh) rotateY(0deg)" } : { opacity: 1, transform: "translate(0px,0px) rotateY(0deg)" }}
          animate={
            rain
              ? { transform: ["translateY(0vh) rotateY(0deg)", "translateY(112vh) rotateY(1080deg)"] }
              : { opacity: 0, transform: `translate(${Math.cos(p.a) * spread * (0.4 + p.r)}px, ${Math.sin(p.a) * spread * (0.4 + p.r)}px) rotateY(720deg)` }
          }
          transition={rain ? { duration: 2.6 + p.s * 2, repeat: Infinity, delay: p.t * 3, ease: "easeIn" } : { duration: 1, ease: EASE_OUT }}
        >
          ★
        </motion.span>
      ))}
    </>
  );
}

function Blueprint({ big }: { big?: boolean }) {
  const size = big ? 520 : 260;
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" className="absolute" aria-hidden>
      <g fill="none" stroke="#bfdbfe" strokeWidth={big ? 0.6 : 1.2}>
        <motion.rect x={40} y={40} width={120} height={120} initial={{ pathLength: 0, opacity: 1 }} animate={{ pathLength: 1, opacity: big ? 1 : 0 }} transition={{ duration: big ? 1.4 : 0.9, ease: "easeInOut" }} />
        <motion.circle cx={100} cy={100} r={60} initial={{ pathLength: 0, opacity: 1 }} animate={{ pathLength: 1, opacity: big ? 1 : 0 }} transition={{ duration: big ? 1.6 : 0.9, delay: 0.15, ease: "easeInOut" }} />
        <motion.path d="M0 100H200M100 0V200" strokeDasharray="4 4" initial={{ pathLength: 0, opacity: 1 }} animate={{ pathLength: 1, opacity: big ? 0.8 : 0 }} transition={{ duration: 0.8, ease: "easeOut" }} />
        <motion.path d="M40 172H160M40 168V176M160 168V176" initial={{ pathLength: 0, opacity: 1 }} animate={{ pathLength: 1, opacity: big ? 1 : 0 }} transition={{ duration: 0.7, delay: 0.4 }} />
      </g>
    </svg>
  );
}

function Implode() {
  const parts = useParticles(91, 24);
  return (
    <>
      <motion.span
        className="absolute size-44 rounded-full bg-black"
        style={{ boxShadow: "0 0 60px 20px rgba(255,42,31,0.45)" }}
        initial={{ transform: "scale(0)", opacity: 1 }}
        animate={{ transform: ["scale(0)", "scale(1.1)", "scale(0)"], opacity: [1, 1, 0] }}
        transition={{ duration: 1, times: [0, 0.45, 1], ease: "easeInOut" }}
      />
      {parts.map((p) => (
        <motion.span
          key={p.i}
          className="absolute size-1.5 rounded-full bg-white"
          initial={{ opacity: 1, transform: `translate(${Math.cos(p.a) * 220}px, ${Math.sin(p.a) * 220}px)` }}
          animate={{ opacity: 0, transform: "translate(0px, 0px)" }}
          transition={{ duration: 0.8, ease: "easeIn", delay: p.t * 0.15 }}
        />
      ))}
    </>
  );
}

/** Plays once when you lock in your cards. Only you see it. */
export function PlayBurst({ skin }: { skin: Skin }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center overflow-hidden" aria-hidden>
      {skin.id === "classic" && <Shards colors={["#ff2a1f", "#000000", "#ffffff"]} />}
      {skin.id === "blueprint" && (
        <>
          <Blueprint />
          <Shards colors={["#bfdbfe", "#3b82f6"]} count={12} spread={180} />
        </>
      )}
      {skin.id === "sakura" && <Petals count={22} spread={220} />}
      {skin.id === "neon" && (
        <>
          <motion.div className="absolute inset-0" style={{ background: "#22d3ee" }} initial={{ opacity: 0.18 }} animate={{ opacity: 0 }} transition={{ duration: 0.4 }} />
          <Rings colors={["#22d3ee", "#f472b6"]} />
        </>
      )}
      {skin.id === "gold" && (
        <>
          <Coins count={16} spread={240} />
          <Rings colors={["#f5d77a"]} />
        </>
      )}
      {skin.id === "void" && <Implode />}
    </div>
  );
}

/* ---------- Win scene: the backdrop of the victory screen ---------- */

function Warp() {
  const parts = useParticles(57, 60);
  return (
    <>
      {parts.map((p) => (
        <motion.span
          key={p.i}
          className="absolute top-1/2 left-1/2 h-0.5 rounded-full bg-white"
          style={{ width: 20 + p.s * 40, transformOrigin: "left center" }}
          initial={{ opacity: 0, transform: `rotate(${(p.a * 180) / Math.PI}deg) translateX(0px)` }}
          animate={{ opacity: [0, 1, 0], transform: [`rotate(${(p.a * 180) / Math.PI}deg) translateX(0px)`, `rotate(${(p.a * 180) / Math.PI}deg) translateX(700px)`] }}
          transition={{ duration: 1.4 + p.r, repeat: Infinity, delay: p.t * 2, ease: "easeIn" }}
        />
      ))}
    </>
  );
}

/** Full-screen, looping background for the win screen in the player's skin. */
export function WinScene({ skin }: { skin: Skin }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden" aria-hidden>
      {skin.id === "classic" && (
        <>
          <div className="absolute top-1/2 left-1/2 size-[180vmax] -translate-x-1/2 -translate-y-1/2 animate-[spin_24s_linear_infinite] bg-[repeating-conic-gradient(rgba(255,255,255,0.13)_0deg_9deg,transparent_9deg_24deg)]" />
          <Shards colors={["#ffffff", "#000000", "#000000"]} count={40} spread={420} />
        </>
      )}
      {skin.id === "blueprint" && (
        <>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(191,219,254,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(191,219,254,0.18)_1px,transparent_1px)] bg-[size:28px_28px]" />
          <Blueprint big />
        </>
      )}
      {skin.id === "sakura" && <Petals count={36} spread={0} rain />}
      {skin.id === "neon" && (
        <>
          <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(34,211,238,0.06)_0px,rgba(34,211,238,0.06)_1px,transparent_1px,transparent_4px)]" />
          <Rings colors={["#22d3ee", "#f472b6", "#22d3ee"]} repeat />
        </>
      )}
      {skin.id === "gold" && (
        <>
          <div className="absolute top-1/2 left-1/2 size-[180vmax] -translate-x-1/2 -translate-y-1/2 animate-[spin_30s_linear_infinite] bg-[repeating-conic-gradient(rgba(245,215,122,0.12)_0deg_6deg,transparent_6deg_20deg)]" />
          <Coins count={26} spread={0} rain />
        </>
      )}
      {skin.id === "void" && <Warp />}
    </div>
  );
}
