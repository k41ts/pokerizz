"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import type { PlayerState } from "@/lib/game";
import { JOKERS } from "@/lib/jokers";
import { JOKER_SLOTS } from "@/lib/game";
import { MAX_HP } from "@/lib/scoring";
import { AnimatedNumber, Pill } from "./ui";

const BARS = 10;
const PER_BAR = MAX_HP / BARS;

/** HP as ten pill bars (10 HP each) with red caps, after the reference's bar chart. */
function HpChart({ hp }: { hp: number }) {
  return (
    <div className="flex h-16 items-end gap-1 sm:h-20 sm:gap-1.5" role="meter" aria-label="HP" aria-valuemin={0} aria-valuemax={MAX_HP} aria-valuenow={hp}>
      {Array.from({ length: BARS }, (_, i) => {
        const fill = Math.min(1, Math.max(0, (hp - i * PER_BAR) / PER_BAR));
        return (
          <div
            key={i}
            className="relative h-full flex-1 overflow-hidden rounded-full outline-1 -outline-offset-1 outline-ink/15 outline-dashed"
            style={{ height: `${55 + i * 5}%` }}
          >
            <div
              className="absolute inset-0 flex flex-col rounded-full bg-paper transition-transform duration-700 ease-[var(--ease-out)]"
              style={{ transform: `translateY(${(1 - fill) * 100}%)`, transitionDelay: `${(BARS - i) * 30}ms` }}
            >
              <div className="h-[30%] rounded-full bg-signal" />
            </div>
          </div>
        );
      })}
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
          <div
            className="h-3 flex-1 overflow-hidden rounded-full bg-panel"
            role="meter"
            aria-label="HP"
            aria-valuemin={0}
            aria-valuemax={MAX_HP}
            aria-valuenow={hp}
          >
            <div
              className="h-full origin-left rounded-full bg-signal transition-transform duration-700 ease-[var(--ease-out)]"
              style={{ transform: `scaleX(${Math.max(0, hp / MAX_HP)})` }}
            />
          </div>
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
            <div className={`font-display text-4xl leading-none ${hp <= 25 ? "text-signal" : ""}`}>
              <AnimatedNumber value={hp} />
            </div>
            <p className="mt-1 text-sm text-steel">HP dari {MAX_HP}</p>
          </div>
        </div>
        <div className="mt-3 rounded-2xl bg-panel p-3">
          <HpChart hp={hp} />
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
