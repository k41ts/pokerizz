"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Card } from "@/lib/cards";
import type { GameState, PlayerIndex, RoundResult } from "@/lib/game";
import { chipValue, HAND_INFO, HAND_TYPES } from "@/lib/hands";
import { JOKERS } from "@/lib/jokers";
import { SkinContext, skinById } from "@/lib/skins";
import { play, type Sfx } from "@/lib/sound";
import HandFx, { FX_HOLD } from "./HandFx";
import PlayingCard from "./PlayingCard";
import { AnimatedNumber, Pill, PrimaryButton } from "./ui";

// On desktop, card size also follows screen height so short laptop screens never clip the table.
const CARD_W = "w-[18.5%] max-w-[84px] lg:max-w-[min(130px,11dvh)]";

function Slots({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex w-full justify-center gap-2 max-sm:hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className={`${CARD_W} aspect-[5/7] rounded-[9%] border border-dashed border-paper/20`} />
        ))}
      </div>
      <p className="text-sm text-paper/50">{text}</p>
    </div>
  );
}

/** Locked cards during a turn: small on phones so the hand below stays on screen. */
const ROW_W = "w-[12%] max-w-[46px] sm:w-[18.5%] sm:max-w-[84px] lg:max-w-[min(96px,9dvh)]";

function Row({ cards, faceDown, layout }: { cards: Card[]; faceDown?: boolean; layout?: boolean }) {
  return (
    <div className="flex w-full justify-center gap-1.5 sm:gap-2">
      {cards.map((c, i) => (
        <PlayingCard key={c.id} card={c} faceDown={faceDown} layoutId={layout ? c.id : undefined} index={i} className={ROW_W} />
      ))}
    </div>
  );
}

type Beat =
  | { kind: "flip" }
  | { kind: "label"; side: PlayerIndex }
  | { kind: "fx"; side: PlayerIndex }
  | { kind: "chip"; side: PlayerIndex; card: Card; value: number; step: number }
  | { kind: "bonus"; side: PlayerIndex; text: string; value: number }
  | { kind: "mult"; side: PlayerIndex; value: number }
  | { kind: "clash" }
  | { kind: "done" };

const DELAY: Record<Beat["kind"], number> = {
  flip: 250,
  label: 520,
  fx: 120,
  chip: 210,
  bonus: 300,
  mult: 340,
  clash: 480,
  done: 650,
};

function buildBeats(result: RoundResult, order: PlayerIndex[]): Beat[] {
  const beats: Beat[] = [{ kind: "flip" }];
  for (const side of order) {
    const s = result.scores[side];
    beats.push({ kind: "label", side });
    if (s.hand !== "high_card") beats.push({ kind: "fx", side });
    // Combination cards first, then the extra cards, which also add their points.
    const extras = result.plays[side].filter((c) => !s.scoring.some((x) => x.id === c.id));
    [...s.scoring, ...extras].forEach((card, step) => beats.push({ kind: "chip", side, card, value: chipValue(card.rank), step }));
    for (const b of s.bonuses) beats.push({ kind: "bonus", side, text: `${JOKERS[b.jokerId].icon} ${JOKERS[b.jokerId].name}`, value: b.amount });
    if (s.multiplier !== 1) beats.push({ kind: "mult", side, value: s.multiplier });
  }
  beats.push({ kind: "clash" }, { kind: "done" });
  return beats;
}

function sfxFor(beat: Beat, result: RoundResult): [Sfx, number][] {
  switch (beat.kind) {
    case "flip":
      return [["flip", 0]];
    case "label":
      return [["stamp", 0]];
    case "fx":
      return [["combo", HAND_TYPES.indexOf(result.scores[beat.side].hand)]];
    case "chip":
      return [["chip", beat.step]];
    case "bonus":
      return [["chip", 8]];
    case "mult":
      return [["joker", 0]];
    case "clash": {
      const { damage, heal, blocked, winner } = result.outcome;
      if (winner === null) return [["block", 0]];
      const out: [Sfx, number][] = [[damage[0] + damage[1] > 0 ? "hit" : "block", 0]];
      if (blocked[0] + blocked[1] > 0 && damage[0] + damage[1] > 0) out.push(["block", 0]);
      if (heal[0] + heal[1] > 0) out.push(["heal", 0]);
      return out;
    }
    default:
      return [];
  }
}

interface RevealProps {
  result: RoundResult;
  me: PlayerIndex;
  skins: [string, string];
  names: [string, string];
  instant?: boolean;
  onImpact: () => void;
  footer: (done: boolean) => React.ReactNode;
}

/** Plays the round out beat by beat: flip, count each scoring card, add jokers, then clash. */
function RevealSequence({ result, me, skins, names, instant, onImpact, footer }: RevealProps) {
  const them: PlayerIndex = me === 0 ? 1 : 0;
  const beats = useMemo(() => buildBeats(result, [them, me]), [result, them, me]);
  const [beat, setBeat] = useState(instant ? beats.length - 1 : -1);
  const impacted = useRef(false);
  const clashAt = beats.findIndex((b) => b.kind === "clash");

  useEffect(() => {
    if (beat >= beats.length - 1) return;
    const next = beats[beat + 1];
    const now = beats[beat];
    // Hold on a combination's effect before counting its cards.
    const hold = now?.kind === "fx" ? FX_HOLD[result.scores[now.side].hand] : 0;
    const t = setTimeout(() => setBeat((b) => b + 1), DELAY[next.kind] + hold);
    return () => clearTimeout(t);
  }, [beat, beats, result]);

  // The effect outlives its beat so it can finish animating.
  const [fx, setFx] = useState<{ id: number; side: PlayerIndex } | null>(null);
  useEffect(() => {
    const now = beats[beat];
    if (instant || now?.kind !== "fx") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- starts the effect for this beat
    setFx({ id: beat, side: now.side });
    const t = setTimeout(() => setFx(null), FX_HOLD[result.scores[now.side].hand] + 900);
    return () => clearTimeout(t);
  }, [beat, beats, instant, result]);

  useEffect(() => {
    if (beat < 0 || instant) return;
    const now = beats[beat];
    // Each side's cards sound in that player's skin; the clash itself uses yours.
    const voice = "side" in now ? skins[now.side] : skins[me];
    for (const [sfx, step] of sfxFor(now, result)) play(sfx, step, voice);
  }, [beat, beats, result, instant, skins, me]);

  useEffect(() => {
    if (beat >= clashAt && !impacted.current) {
      impacted.current = true;
      onImpact();
    }
  }, [beat, clashAt, onImpact]);

  const passed = beats.slice(0, beat + 1);
  const flipped = beat >= 0;
  const clashed = beat >= clashAt;
  const current = beats[beat];

  function sideView(side: PlayerIndex) {
    const s = result.scores[side];
    const labelShown = passed.some((b) => b.kind === "label" && b.side === side);
    let score = labelShown ? s.base : 0;
    const counted = new Set<string>();
    for (const b of passed) {
      if (b.kind === "chip" && b.side === side) {
        score += b.value;
        counted.add(b.card.id);
      }
      if (b.kind === "bonus" && b.side === side) score += b.value;
      if (b.kind === "mult" && b.side === side) score = s.total;
    }
    if (clashed) score = s.total;
    const won = clashed && result.outcome.winner === side;
    const lost = clashed && result.outcome.winner !== null && result.outcome.winner !== side;

    const popup =
      current && "side" in current && current.side === side && current.kind !== "label"
        ? current.kind === "chip"
          ? { key: beat, text: `+${current.value}`, cardId: current.card.id }
          : current.kind === "bonus"
            ? { key: beat, text: `+${current.value} ${current.text}`, cardId: null }
            : current.kind === "mult"
              ? { key: beat, text: `×${current.value}`, cardId: null }
              : null
        : null;

    return (
      <SkinContext.Provider value={skinById(skins[side])}>
      <div className={`flex flex-col items-center gap-3 transition-opacity duration-300 ${lost ? "opacity-55" : ""}`}>
        <div className="flex w-full items-center justify-between gap-2">
          <span className="text-sm text-paper/60">{side === me ? "Kamu" : names[side]}</span>
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {labelShown && (
                <motion.span
                  initial={{ opacity: 0, transform: "scale(1.35) rotate(-4deg)" }}
                  animate={{ opacity: 1, transform: "scale(1) rotate(0deg)" }}
                  transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
                >
                  <Pill tone={won ? "red" : "light"}>
                    {HAND_INFO[s.hand].label} +{s.base}
                  </Pill>
                </motion.span>
              )}
            </AnimatePresence>
            <span className={`font-display text-2xl sm:text-3xl ${won ? "text-signal" : "text-paper"}`}>
              <AnimatedNumber value={score} />
            </span>
          </div>
        </div>
        <div className="relative flex w-full justify-center gap-2">
          {result.plays[side].map((c, i) => {
            const isScoring = s.scoring.some((x) => x.id === c.id);
            return (
              <div key={c.id} className={`relative ${CARD_W}`}>
                <PlayingCard
                  card={c}
                  faceDown={!flipped}
                  index={i}
                  scoring={counted.has(c.id)}
                  dimmed={labelShown && !isScoring && !counted.has(c.id)}
                  layoutId={side === me ? c.id : undefined}
                />
                {popup?.cardId === c.id && (
                  <span key={popup.key} className="animate-float-up pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 font-display text-lg text-signal">
                    {popup.text}
                  </span>
                )}
              </div>
            );
          })}
          {popup && popup.cardId === null && (
            <span key={popup.key} className="animate-float-up pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-signal px-3 py-1 text-sm font-semibold text-paper">
              {popup.text}
            </span>
          )}
        </div>
      </div>
      </SkinContext.Provider>
    );
  }

  const { winner, damage } = result.outcome;
  const done = beat >= beats.length - 1;

  return (
    <div className="flex flex-col gap-4">
      {fx && (
        <HandFx
          id={fx.id}
          hand={result.scores[fx.side].hand}
          suit={result.scores[fx.side].scoring[0].suit}
          skin={skinById(skins[fx.side])}
        />
      )}
      {sideView(them)}
      <div className="relative flex h-10 items-center justify-center">
        <div className="absolute inset-x-0 top-1/2 h-px bg-paper/15" />
        <AnimatePresence mode="wait">
          {clashed ? (
            <motion.p
              key="result"
              initial={{ opacity: 0, transform: "scale(0.92)" }}
              animate={{ opacity: 1, transform: "scale(1)" }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className="relative rounded-full bg-paper px-4 py-1.5 text-center text-xs font-semibold text-ink sm:text-sm"
            >
              {winner === null
                ? "Seri. Ga ada damage."
                : damage[winner === me ? them : me] === 0
                  ? "Menang ronde, tapi Tameng nahan semua damage."
                  : winner === me
                    ? `Kamu menang ronde. Lawan −${damage[them]} HP`
                    : `Lawan menang ronde. Kamu −${damage[me]} HP`}
            </motion.p>
          ) : (
            <motion.span key="vs" exit={{ opacity: 0 }} className="relative rounded-full bg-ink px-3 font-display text-sm text-paper/60">
              VS
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      {sideView(me)}
      <div className="flex min-h-11 items-center justify-center gap-3">
        {footer(done)}
        {!done && (
          <button
            type="button"
            onClick={() => {
              setFx(null);
              setBeat(beats.length - 1);
            }}
            className="text-sm text-paper/50 underline-offset-4 hover:text-paper hover:underline"
          >
            Lewati animasi
          </button>
        )}
      </div>
    </div>
  );
}

interface ArenaProps {
  view: GameState;
  me: PlayerIndex;
  skins: [string, string];
  onImpact: () => void;
  onContinue: () => void;
}

export default function Arena({ view, me, skins, onImpact, onContinue }: ArenaProps) {
  const them: PlayerIndex = me === 0 ? 1 : 0;
  const { phase, players } = view;
  const names: [string, string] = [players[0].name, players[1].name];
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const result = phase.kind === "reveal" ? phase.result : null;

  // The table jolts on a hit, harder the bigger the damage.
  const impact = useCallback(() => {
    onImpact();
    const dmg = result ? Math.max(...result.outcome.damage) : 0;
    if (!ref.current || reduce || dmg <= 0) return;
    const k = Math.min(1.6, 0.6 + dmg / 40);
    ref.current.animate(
      [
        { transform: "translate(0, 0)" },
        { transform: `translate(${-8 * k}px, ${4 * k}px)` },
        { transform: `translate(${7 * k}px, ${-3 * k}px)` },
        { transform: `translate(${-4 * k}px, ${2 * k}px)` },
        { transform: "translate(0, 0)" },
      ],
      { duration: 380, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
    );
  }, [onImpact, result, reduce]);

  return (
    <section ref={ref} className="relative flex sm:min-h-[260px] flex-col justify-center overflow-hidden lg:flex-1 rounded-[22px] p-3 text-paper sm:rounded-[28px] sm:p-5" style={{ background: skinById(skins[me]).board }}>
      <svg className="pointer-events-none absolute -right-24 -bottom-24 size-80 text-paper/[0.06]" viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" />
        <circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeDasharray="2 3" />
        <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" />
      </svg>

      {phase.kind === "turn" && (
        <div className="relative flex flex-col gap-3 sm:gap-5">
          {players[them].played ? (
            <div className="flex flex-col items-center gap-2">
              <SkinContext.Provider value={skinById(skins[them])}>
                <Row cards={players[them].played!} faceDown />
              </SkinContext.Provider>
              <p className="text-sm text-paper/60">Lawan udah kunci {players[them].played!.length} kartu</p>
            </div>
          ) : (
            <Slots text={players[them].isBot ? "Bot lagi mikir…" : "Lawan lagi milih kartu…"} />
          )}
          <div className="h-px bg-paper/15" />
          {players[me].played ? (
            <div className="flex flex-col items-center gap-2">
              <SkinContext.Provider value={skinById(skins[me])}>
                <Row cards={players[me].played!} layout />
              </SkinContext.Provider>
              <p className="flex items-center gap-2 text-sm text-paper/60">
                <span className="animate-pulse-dot size-1.5 rounded-full bg-signal" /> Kartumu terkunci. Nunggu lawan…
              </p>
            </div>
          ) : (
            <Slots text="Pilih 1–5 kartu di bawah, lalu tekan Main" />
          )}
        </div>
      )}

      {(phase.kind === "reveal" || phase.kind === "gameOver") && (
        <RevealSequence
          key={view.round}
          result={phase.result}
          me={me}
          skins={skins}
          names={names}
          instant={phase.kind === "gameOver"}
          onImpact={impact}
          footer={(done) =>
            phase.kind === "reveal" && done ? (
              phase.ready[me] ? (
                <p className="flex items-center gap-2 text-sm text-paper/70">
                  <span className="animate-pulse-dot size-1.5 rounded-full bg-signal" /> Nunggu lawan siap…
                </p>
              ) : (
                <PrimaryButton tone="red" autoFocus onClick={onContinue}>
                  Lanjut
                </PrimaryButton>
              )
            ) : null
          }
        />
      )}
    </section>
  );
}
