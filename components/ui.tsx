"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { isMuted, onMuteChange, play, setMuted } from "@/lib/sound";

export function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden>
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

export function ChevronsIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m6 7 5 5-5 5M13 7l5 5-5 5" />
    </svg>
  );
}

export function Pill({ children, tone = "light", className = "" }: { children: React.ReactNode; tone?: "light" | "dark" | "red" | "ghost"; className?: string }) {
  const tones = {
    light: "bg-paper text-ink",
    dark: "bg-ink text-paper",
    red: "bg-signal text-paper",
    ghost: "bg-transparent text-ink ring-1 ring-ink/25",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

/** Black pill button with a circular chevron on the right, as in the reference. */
export function PrimaryButton({
  children,
  onClick,
  disabled,
  tone = "dark",
  autoFocus,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "dark" | "red";
  autoFocus?: boolean;
  className?: string;
}) {
  const bg = tone === "red" ? "bg-signal" : "bg-ink";
  return (
    <button
      type="button"
      autoFocus={autoFocus}
      disabled={disabled}
      onClick={() => {
        play("click");
        onClick?.();
      }}
      className={`press inline-flex items-center gap-3 rounded-full ${bg} py-1.5 pr-1.5 pl-5 text-sm font-semibold text-paper disabled:opacity-35 ${className}`}
    >
      {children}
      <span className={`grid size-8 place-items-center rounded-full bg-paper ${tone === "red" ? "text-signal" : "text-ink"}`}>
        <ChevronsIcon className="size-4" />
      </span>
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
  className = "",
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => {
        play("click");
        onClick?.();
      }}
      className={`press rounded-full bg-paper px-5 py-2.5 text-sm font-semibold text-ink ring-1 ring-ink/15 hover:bg-panel disabled:opacity-35 ${className}`}
    >
      {children}
    </button>
  );
}

function useMuted() {
  return useSyncExternalStore(
    (cb) => onMuteChange(cb),
    isMuted,
    () => false,
  );
}

export function SoundToggle() {
  const muted = useMuted();
  return (
    <button
      type="button"
      onClick={() => {
        setMuted(!muted);
        if (muted) play("click");
      }}
      aria-label={muted ? "Nyalakan suara" : "Matikan suara"}
      aria-pressed={!muted}
      className="press grid size-9 place-items-center rounded-full bg-paper text-ink ring-1 ring-ink/10 hover:bg-panel"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" />
        {muted ? <path d="m16 9 5 6m0-6-5 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}
      </svg>
    </button>
  );
}

/** Counts from the previous value to the new one; text-only so it never shifts layout. */
export function AnimatedNumber({ value, className = "" }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = String(value);
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration: 0.35,
      ease: [0.23, 1, 0.32, 1],
      onUpdate: (v) => (el.textContent = String(Math.round(v))),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, reduce]);
  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {value}
    </span>
  );
}

export function Logo() {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-ink p-1.5 text-paper sm:pr-4" aria-label="Kartu Duel">
      <span className="grid size-7 place-items-center rounded-full bg-signal font-display text-[10px]">KD</span>
      <span className="font-display text-xs tracking-wide max-sm:hidden">Kartu Duel</span>
    </span>
  );
}
