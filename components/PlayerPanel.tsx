"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import type { PlayerState } from "@/lib/game";
import { JOKERS } from "@/lib/jokers";
import { JOKER_SLOTS } from "@/lib/game";
import { MAX_HP } from "@/lib/scoring";
import { AnimatedNumber, Pill } from "./ui";

/**
 * HP as one horizontal bar with a tick every 10 HP. On a hit the red fill drops at once
 * and a pale trail follows a moment later, so you can see how much was lost.
 */
function HealthBar({ hp, size }: { hp: number; size: "sm" | "lg" }) {
  const ratio = Math.max(0, Math.min(1, hp / MAX_HP));
  const low = hp <= 25;
  return (
    <div
      className={`relative w-full overflow-hidden rounded-full bg-panel ring-1 ring-ink/10 ${size === "lg" ? "h-11" : "h-4 flex-1"}`}
      role="meter"
      aria-label="HP"
      aria-valuemin={0}
      aria-valuemax={MAX_HP}
      aria-valuenow={hp}
    >
      <div
        className="absolute inset-0 origin-left rounded-full bg-signal/30 transition-transform duration-700 ease-[var(--ease-out)]"
        style={{ transform: `scaleX(${ratio})`, transitionDelay: "450ms" }}
      />
      <div
        className={`absolute inset-0 origin-left rounded-full bg-signal transition-transform duration-500 ease-[var(--ease-out)] ${low ? "animate-pulse-dot" : ""}`}
        style={{ transform: `scaleX(${ratio})` }}
      />
      {size === "lg" && (
        <div className="pointer-events-none absolute inset-0 flex" aria-hidden>
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className={`flex-1 ${i < 9 ? "border-r-2 border-paper/70" : ""}`} />
          ))}
        </div>
      )}
      {size === "lg" && <div className="pointer-events-none absolute inset-x-4 top-2 h-2 rounded-full bg-paper/25" aria-hidden />}
    </div>
  );
}

export interface Impact {
  id: number;
  damage: number;
  heal: number;
  blocked: number;
}

interface Props {
  player: PlayerState;
  hp: number;
  isYou: boolean;
  status?: React.ReactNode;
  impact?: Impact | null;
}

export default function PlayerPanel({ player, hp, isYou, status, impact }: Props) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!impact || impact.damage <= 0 || reduce || !ref.current) return;
    ref.current.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-10px) rotate(-0.8deg)" },
        { transform: "translateX(9px) rotate(0.6deg)" },
        { transform: "translateX(-6px)" },
        { transform: "translateX(3px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 420, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
    );
  }, [impact, reduce]);

  return (
    <section ref={ref} className="relative overflow-hidden rounded-[22px] bg-paper p-3 sm:rounded-[28px] sm:p-5">
      {/* Phones: one slim row so the cards stay on screen. */}
      <div className="sm:hidden">
        <div className="flex items-center gap-3">
          <div className="w-20 min-w-0 shrink-0">
            <p className="text-xs text-steel">{isYou ? "Kamu" : "Lawan"}</p>
            <p className="truncate font-display text-sm leading-tight">{player.isBot ? "Bot" : player.name}</p>
          </div>
          <HealthBar hp={hp} size="sm" />
          <span className={`min-w-[4.25rem] text-right font-display text-xl leading-none ${hp <= 25 ? "text-signal" : ""}`}>
            <AnimatedNumber value={hp} />
          </span>
        </div>
        {(player.jokers.length > 0 || status) && (
          <div className="mt-2 flex items-center justify-between gap-2 text-sm">
            <span className="flex gap-1" aria-label="Joker">
              {player.jokers.map((id) => (
                <span key={id} title={`${JOKERS[id].name}: ${JOKERS[id].description}`} className="grid size-7 place-items-center rounded-lg bg-ink">
                  {JOKERS[id].icon}
                </span>
              ))}
            </span>
            {status && <span className="text-steel">{status}</span>}
          </div>
        )}
      </div>

      <div className="max-sm:hidden">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-steel">{isYou ? "Kamu" : "Lawan"}</p>
            <h2 className="font-display text-base leading-tight">{player.isBot ? "Bot" : player.name}</h2>
          </div>
          <div className="text-right">
            <div className={`font-display text-5xl leading-none ${hp <= 25 ? "text-signal" : ""}`}>
              <AnimatedNumber value={hp} />
            </div>
            <p className="mt-1 text-sm text-steel">HP dari {MAX_HP}</p>
          </div>
        </div>
        <div className="mt-4">
          <HealthBar hp={hp} size="lg" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {Array.from({ length: JOKER_SLOTS }, (_, i) => {
            const id = player.jokers[i];
            return id ? (
              <span key={id} title={JOKERS[id].description}>
                <Pill tone="dark">
                  <span aria-hidden>{JOKERS[id].icon}</span> {JOKERS[id].name}
                </Pill>
              </span>
            ) : (
              <Pill key={i} tone="ghost" className="text-ink/40">
                Slot Joker kosong
              </Pill>
            );
          })}
        </div>
        {status && <div className="mt-3 text-sm text-steel">{status}</div>}
      </div>

      {impact && impact.damage > 0 && (
        <>
          <div key={`f${impact.id}`} className="animate-flash pointer-events-none absolute inset-0 bg-signal" />
          <div key={`d${impact.id}`} className="animate-float-up pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 font-display text-3xl text-signal sm:top-4 sm:text-4xl">
            −{impact.damage}
          </div>
        </>
      )}
      {impact && impact.heal > 0 && (
        <div key={`h${impact.id}`} className="animate-float-up pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 font-display text-2xl text-ink">
          +{impact.heal} HP
        </div>
      )}
      {impact && impact.blocked > 0 && (
        <div key={`b${impact.id}`} className="animate-float-up pointer-events-none absolute top-14 right-6 text-sm font-semibold [animation-delay:200ms]">
          🛡️ tahan {impact.blocked}
        </div>
      )}
    </section>
  );
}
