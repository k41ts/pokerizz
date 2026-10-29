"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { card, type Card } from "@/lib/cards";
import { JOKERS } from "@/lib/jokers";
import { play } from "@/lib/sound";
import CardArt from "./CardArt";
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
        ["Kamu", 100],
        ["Lawan", hp],
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
      <p className="h-8 font-display text-lg">{step === 2 ? "Pair · As" : step === 1 ? "High Card" : "Ketuk kartu…"}</p>
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
      <p className="h-8 font-display text-lg">{step === 0 ? "Kartu jelek…" : step === 1 ? "Pilih, tekan Buang" : "Dapat kartu baru!"}</p>
    </div>
  );
}

function ClashDemo() {
  const step = useLoop(3, 1300);
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-3">
      <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="rounded-2xl bg-paper p-4 text-ink">
          <p className="text-sm text-ink/60">Kamu</p>
          <p className="font-display text-3xl">70</p>
        </div>
        <span className="font-display text-paper/40">VS</span>
        <motion.div
          className="relative rounded-2xl bg-paper p-4 text-ink"
          animate={step === 2 ? { transform: ["translateX(0px)", "translateX(-8px)", "translateX(6px)", "translateX(0px)"] } : { transform: "translateX(0px)" }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-sm text-ink/60">Lawan</p>
          <p className="font-display text-3xl">42</p>
          {step === 2 && <span className="animate-float-up absolute -top-3 right-2 font-display text-2xl text-signal">−28</span>}
        </motion.div>
      </div>
      <p className="h-8 font-display text-lg">{step === 2 ? "70 − 42 = 28 damage" : "Buka barengan…"}</p>
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
        <span className="text-3xl">{j.icon}</span>
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

const SLIDES = [
  {
    title: "Habisin HP lawan",
    body: "Kamu dan lawan mulai dengan 100 HP. Yang HP-nya habis duluan, kalah.",
    Demo: GoalDemo,
  },
  {
    title: "Pilih kartu",
    body: "Tiap ronde kamu pegang 8 kartu. Ketuk 1–5 kartu buat bikin kombinasi poker. Bingung? Tekan \"Pilihin\" dan game milih kombinasi terbaik buatmu.",
    Demo: PickDemo,
  },
  {
    title: "Hitung skor",
    body: "Skor = nilai kombinasi + nilai kartunya. Angka 2–9 sesuai angkanya, 10/J/Q/K bernilai 10, As 11.",
    Demo: ScoreDemo,
  },
  {
    title: "Buang kartu jelek",
    body: "Pilih kartu yang ga kepake lalu tekan Buang. Kamu dapat kartu baru. Bisa 2 kali tiap ronde.",
    Demo: DiscardDemo,
  },
  {
    title: "Adu dan serang",
    body: "Kartu kalian dibuka barengan. Skor lebih tinggi menyerang, damage-nya selisih skor.",
    Demo: ClashDemo,
  },
  {
    title: "Joker dan bintang",
    body: "Tiap 3 ronde pilih satu Joker buat bonus. Menang online pakai akun dapat +1 bintang buat naik rank.",
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
          <div className="flex gap-1.5" aria-label={`Langkah ${i + 1} dari ${SLIDES.length}`}>
            {SLIDES.map((_, k) => (
              <span key={k} className={`h-2 rounded-full transition-[width,background-color] duration-300 ${k === i ? "w-8 bg-signal" : k < i ? "w-2 bg-ink" : "w-2 bg-ink/20"}`} />
            ))}
          </div>
          <button type="button" onClick={onClose} className="text-base text-ink/60 hover:text-ink">
            Lewati
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
                  Langkah {i + 1} dari {SLIDES.length}
                </p>
                <h2 className="mt-1 font-display text-2xl sm:text-3xl">{slide.title}</h2>
                <p className="mt-2 text-base leading-relaxed text-ink/75 sm:text-lg">{slide.body}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between gap-3">
          <SecondaryButton disabled={i === 0} onClick={() => go(i - 1)} className="text-base">
            Kembali
          </SecondaryButton>
          {last ? (
            <PrimaryButton tone="red" onClick={onPlayBot} className="text-base">
              Coba lawan bot
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={() => go(i + 1)} className="text-base">
              Lanjut
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}
