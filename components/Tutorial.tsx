"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { card, type Card } from "@/lib/cards";
import { HAND_INFO, HAND_TYPES } from "@/lib/hands";
import { play } from "@/lib/sound";
import CardArt from "./CardArt";
import { EXAMPLES } from "./ComboGuide";
import JokerIcon from "./JokerIcon";
import { JOKERS } from "@/lib/jokers";
import { PrimaryButton, SecondaryButton } from "./ui";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** Steps 0..n-1 on a loop, so each demo keeps replaying while the slide is open. */
function useLoop(steps: number, every: number) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(reduce ? steps - 1 : 0);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setStep((s) => (s + 1) % steps), every);
    return () => clearInterval(t);
  }, [steps, every, reduce]);
  return step;
}

function Mini({ c, lifted, glow, gone, w = "w-14 sm:w-16" }: { c: Card; lifted?: boolean; glow?: boolean; gone?: boolean; w?: string }) {
  return (
    <motion.div
      className={`${w} rounded-[9%] ${glow ? "shadow-[0_0_0_3px_var(--color-signal)]" : "shadow-md"}`}
      animate={{ transform: `translateY(${gone ? -60 : lifted ? -14 : 0}px) rotate(${gone ? 14 : 0}deg)`, opacity: gone ? 0 : 1 }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
    >
      <CardArt card={c} />
    </motion.div>
  );
}

function GoalDemo() {
  const step = useLoop(3, 1200);
  const hp = [100, 64, 0][step];
  return (
    <div className="grid w-full max-w-sm grid-cols-2 gap-3">
      {[
        ["You", 100],
        ["Opponent", hp],
      ].map(([who, value]) => (
        <div key={who} className="rounded-2xl bg-paper p-4 text-left text-ink">
          <p className="text-sm text-ink/60">{who}</p>
          <p className="font-display text-3xl tabular-nums">{value}</p>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-panel">
            <div
              className="h-full origin-left rounded-full bg-signal transition-transform duration-500 ease-[var(--ease-out)]"
              style={{ transform: `scaleX(${Number(value) / 100})` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

const HAND = [card(14, "S"), card(14, "H"), card(7, "C"), card(13, "D"), card(3, "H"), card(9, "S")];
function PickDemo() {
  const step = useLoop(3, 1100);
  const lifted = (i: number) => (step >= 1 && i === 0) || (step >= 2 && i === 1);
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-1.5 pt-4">
        {HAND.map((c, i) => (
          <Mini key={c.id} c={c} lifted={lifted(i)} glow={lifted(i)} w="w-11 sm:w-14" />
        ))}
      </div>
      <p className="h-8 font-display text-lg">{step === 2 ? "Pair of Aces" : step === 1 ? "High Card" : "Tap cards…"}</p>
    </div>
  );
}

const SCORE = [card(10, "S"), card(10, "H"), card(13, "D"), card(13, "C")];
function ScoreDemo() {
  const step = useLoop(6, 700);
  const total = step === 0 ? 0 : 30 + Math.min(step - 1, 4) * 10;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-1.5 pt-5">
        {SCORE.map((c, i) => (
          <div key={c.id} className="relative">
            <Mini c={c} lifted={step - 2 === i} glow={step >= i + 2} />
            {step - 2 === i && (
              <span className="animate-float-up absolute -top-5 left-1/2 -translate-x-1/2 font-display text-lg text-signal">+10</span>
            )}
          </div>
        ))}
      </div>
      <p className="font-display text-lg">
        {step >= 1 ? "Two Pair 30" : "Two Pair"} {step >= 2 && `+ ${Math.min(step - 1, 4) * 10}`} = <span className="text-signal">{total}</span>
      </p>
    </div>
  );
}

const DISCARD_OLD = [card(2, "C"), card(4, "D"), card(6, "S")];
const DISCARD_NEW = [card(12, "H"), card(12, "S"), card(8, "H")];
function DiscardDemo() {
  const step = useLoop(3, 1200);
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex h-28 items-end gap-1.5 sm:h-32">
        <AnimatePresence mode="popLayout">
          {(step < 2 ? DISCARD_OLD : DISCARD_NEW).map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, transform: "translateY(40px)" }}
              animate={{ opacity: 1, transform: `translateY(${step === 1 ? -12 : 0}px)` }}
              exit={{ opacity: 0, transform: "translateY(-70px) rotate(16deg)" }}
              transition={{ duration: 0.35, ease: EASE_OUT, delay: i * 0.05 }}
              className={`w-14 rounded-[9%] sm:w-16 ${step === 1 ? "shadow-[0_0_0_3px_var(--color-signal)]" : "shadow-md"}`}
            >
              <CardArt card={c} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <p className="h-8 font-display text-lg">{step === 0 ? "Weak cards…" : step === 1 ? "Select them, press Discard" : "Fresh cards!"}</p>
    </div>
  );
}

function ClashDemo() {
  const step = useLoop(3, 1300);
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-3">
      <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <div className="rounded-2xl bg-paper p-4 text-ink">
          <p className="text-sm text-ink/60">You</p>
          <p className="font-display text-3xl">70</p>
        </div>
        <span className="font-display text-paper/40">VS</span>
        <motion.div
          className="relative rounded-2xl bg-paper p-4 text-ink"
          animate={step === 2 ? { transform: ["translateX(0px)", "translateX(-8px)", "translateX(6px)", "translateX(0px)"] } : { transform: "translateX(0px)" }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-sm text-ink/60">Opponent</p>
          <p className="font-display text-3xl">42</p>
          {step === 2 && <span className="animate-float-up absolute -top-3 right-2 font-display text-2xl text-signal">−28</span>}
        </motion.div>
      </div>
      <p className="h-8 font-display text-lg">{step === 2 ? "70 − 42 = 28 damage" : "Both reveal at once…"}</p>
    </div>
  );
}

/** Cycles through every combo with a real example, weakest to strongest. */
function ComboDemo() {
  const step = useLoop(HAND_TYPES.length, 1500);
  const hand = HAND_TYPES[step];
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex h-24 items-end justify-center gap-1.5 sm:h-28">
        <AnimatePresence mode="popLayout">
          {EXAMPLES[hand].cards.map((c, i) => (
            <motion.div
              key={`${hand}-${c.id}`}
              initial={{ opacity: 0, transform: "translateY(24px)" }}
              animate={{ opacity: 1, transform: "translateY(0px)" }}
              exit={{ opacity: 0, transform: "translateY(-16px)" }}
              transition={{ duration: 0.3, ease: EASE_OUT, delay: i * 0.04 }}
              className="w-12 rounded-[9%] shadow-md sm:w-14"
            >
              <CardArt card={c} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <p className="font-display text-lg">
        {HAND_INFO[hand].label} <span className="text-signal">{HAND_INFO[hand].value}</span>
      </p>
      <div className="flex gap-1" aria-hidden>
        {HAND_TYPES.map((h, k) => (
          <span key={h} className={`h-1.5 w-4 rounded-full ${k <= step ? "bg-signal" : "bg-paper/20"}`} />
        ))}
      </div>
    </div>
  );
}

function EffectDemo() {
  const step = useLoop(2, 1600);
  return (
    <div className="flex max-w-xs flex-col items-center gap-3 text-center">
      <span className="rounded-full bg-signal px-3 py-1 font-display text-xs text-snow">Match effect</span>
      <p className="font-display text-xl">{step === 0 ? "House Tax" : "Even Steven"}</p>
      <p className="text-sm text-paper/70">{step === 0 ? "Full House scores −30 this match." : "+5 for every even card you play this match."}</p>
    </div>
  );
}

function JokerDemo() {
  const j = JOKERS.pasangan_setia;
  return (
    <div className="flex items-center gap-4">
      <motion.div
        className="flex w-36 flex-col gap-2 rounded-3xl bg-paper p-4 text-left text-ink"
        initial={{ opacity: 0, transform: "perspective(600px) rotateY(80deg)" }}
        animate={{ opacity: 1, transform: "perspective(600px) rotateY(0deg)" }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
      >
        <JokerIcon id="pasangan_setia" className="w-20" />
        <span className="font-display text-sm">{j.name}</span>
        <span className="text-sm text-ink/65">{j.description}</span>
      </motion.div>
      <motion.div
        className="flex size-24 flex-col items-center justify-center rounded-full bg-ink text-paper"
        initial={{ opacity: 0, transform: "scale(0.6) rotate(-20deg)" }}
        animate={{ opacity: 1, transform: "scale(1) rotate(0deg)" }}
        transition={{ type: "spring", duration: 0.6, bounce: 0.45, delay: 0.3 }}
      >
        <span className="text-3xl text-signal">★</span>
        <span className="font-display text-sm">+1</span>
      </motion.div>
    </div>
  );
}

const COMBO_RULE: Record<(typeof HAND_TYPES)[number], string> = {
  high_card: "no combo, best single card",
  pair: "2 of the same rank",
  two_pair: "two different pairs",
  three_kind: "3 of the same rank",
  straight: "5 ranks in a row",
  flush: "5 of one suit",
  full_house: "three of a kind + a pair",
  four_kind: "4 of the same rank",
  straight_flush: "a straight in one suit",
};

const SLIDES: { title: string; body: React.ReactNode; Demo: () => React.ReactNode }[] = [
  {
    title: "Knock their HP to zero",
    body: "You and your opponent both start with 100 HP. Whoever runs out first loses.",
    Demo: GoalDemo,
  },
  {
    title: "Pick your cards",
    body: "Each round you hold 8 cards. Tap 1–5 of them to build a poker combo. As soon as your selection forms a combo, its name appears. Ranked and friend matches give you 20 seconds a round.",
    Demo: PickDemo,
  },
  {
    title: "The combos you can play",
    body: (
      <>
        Weakest to strongest. The full list with examples is on the main menu.
        <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2 sm:text-base">
          {HAND_TYPES.map((h) => (
            <li key={h} className="flex justify-between gap-2 border-b border-ink/10 py-1">
              <span className="font-semibold text-ink">{HAND_INFO[h].label}</span>
              <span className="text-right">{COMBO_RULE[h]}</span>
            </li>
          ))}
        </ul>
      </>
    ),
    Demo: ComboDemo,
  },
  {
    title: "Count the score",
    body: "Score = the combo's value + the points of every card you play, extra cards included. Cards 2–9 are worth their number, 10/J/Q/K are worth 10 and an Ace is worth 11.",
    Demo: ScoreDemo,
  },
  {
    title: "Throw away weak cards",
    body: "Select the cards you don't need and press Discard to draw new ones. You can do this twice a round.",
    Demo: DiscardDemo,
  },
  {
    title: "Clash",
    body: "Both hands are revealed at the same time. The higher score attacks, and the damage is the difference between the scores.",
    Demo: ClashDemo,
  },
  {
    title: "Every match has an effect",
    body: "Each match rolls one effect that applies to both players from the first round to the last. Some reward a combo, some tax one, so the best hand changes from match to match. You see it before round 1, and it stays on screen. Jokers are different: you pick those yourself during the match.",
    Demo: EffectDemo,
  },
  {
    title: "Jokers and stars",
    body: "Every 3 rounds you pick a Joker, a bonus that lasts for the rest of that match. In ranked and friend matches a win gives +1 star and a loss costs one. Points from every match unlock card skins.",
    Demo: JokerDemo,
  },
];

interface Props {
  onClose: () => void;
  onPlayBot: () => void;
}

export default function Tutorial({ onClose, onPlayBot }: Props) {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const slide = SLIDES[i];
  const last = i === SLIDES.length - 1;

  function go(next: number) {
    play("flip");
    setDir(next > i ? 1 : -1);
    setI(next);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && i < SLIDES.length - 1) go(i + 1);
      if (e.key === "ArrowLeft" && i > 0) go(i - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div role="dialog" aria-modal="true" aria-label="Tutorial" className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-concrete">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 p-4 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-label={`Step ${i + 1} of ${SLIDES.length}`}>
            {SLIDES.map((_, k) => (
              <span key={k} className={`h-2 rounded-full transition-[width,background-color] duration-300 ${k === i ? "w-8 bg-signal" : k < i ? "w-2 bg-ink" : "w-2 bg-ink/20"}`} />
            ))}
          </div>
          <button type="button" onClick={onClose} className="text-base text-ink/60 hover:text-ink">
            Skip
          </button>
        </div>

        <div className="relative flex flex-1 flex-col overflow-hidden rounded-[32px] bg-ink text-paper">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={i}
              className="flex flex-1 flex-col"
              initial={{ opacity: 0, transform: `translateX(${dir * 40}px)` }}
              animate={{ opacity: 1, transform: "translateX(0px)" }}
              exit={{ opacity: 0, transform: `translateX(${dir * -40}px)` }}
              transition={{ duration: 0.25, ease: EASE_OUT }}
            >
              <div className="flex min-h-56 flex-1 items-center justify-center p-6">
                <div className="text-paper">
                  <slide.Demo />
                </div>
              </div>
              <div className="bg-paper p-6 text-ink sm:p-8">
                <p className="text-sm text-ink/50">
                  Step {i + 1} of {SLIDES.length}
                </p>
                <h2 className="mt-1 font-display text-2xl sm:text-3xl">{slide.title}</h2>
                <div className="mt-2 text-base leading-relaxed text-ink/75 sm:text-lg">{slide.body}</div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between gap-3">
          <SecondaryButton disabled={i === 0} onClick={() => go(i - 1)} className="text-base">
            Back
          </SecondaryButton>
          {last ? (
            <PrimaryButton tone="red" onClick={onPlayBot} className="text-base">
              Try a practice match
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={() => go(i + 1)} className="text-base">
              Next
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}
