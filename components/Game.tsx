"use client";

import { LayoutGroup } from "motion/react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { JOKER_EVERY, type GameState, type PlayerIndex } from "@/lib/game";
import type { JokerId } from "@/lib/jokers";
import Arena from "./Arena";
import ComboGuide from "./ComboGuide";
import Sheet from "./Sheet";
import GameOver from "./GameOver";
import HandTray from "./HandTray";
import JokerPicker from "./JokerPicker";
import PlayerPanel, { type Impact } from "./PlayerPanel";
import { Logo, Pill, SoundToggle } from "./ui";

/** An action as the local player sends it; the controller adds who sent it. */
export type LocalAction =
  | { type: "discard"; cardIds: string[] }
  | { type: "play"; cardIds: string[] }
  | { type: "continue" }
  | { type: "pickJoker"; jokerId: JokerId | null; replaceIndex?: number };

export interface RankNote {
  kind: "star" | "loss" | "unranked";
  text: string;
}

interface Props {
  /** State as this player may see it. */
  view: GameState;
  me: PlayerIndex;
  act: (action: LocalAction) => void;
  onRestart: () => void;
  onExit: () => void;
  restartLabel?: string;
  banner?: React.ReactNode;
  rankNote?: RankNote | null;
}

/** A black strip sweeps across when a new round starts. */
function RoundBanner({ round }: { round: number }) {
  const [shown, setShown] = useState(round);
  useEffect(() => {
    const t = setTimeout(() => setShown(-1), 1100);
    return () => clearTimeout(t);
  }, [round]);
  return (
    <AnimatePresence>
      {shown === round && (
        <motion.div
          key={round}
          className="pointer-events-none fixed inset-x-0 top-1/3 z-30 flex justify-center overflow-hidden py-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
        >
          <motion.div
            className="flex w-full items-center justify-center gap-4 bg-ink py-4 text-paper"
            initial={{ transform: "translateX(-100%) skewX(-12deg)" }}
            animate={{ transform: "translateX(0%) skewX(0deg)" }}
            exit={{ transform: "translateX(100%) skewX(-12deg)" }}
            transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
          >
            <span className="h-1 w-10 bg-signal" />
            <span className="font-display text-3xl sm:text-5xl">Ronde {round}</span>
            <span className="h-1 w-10 bg-signal" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Game({ view, me, act, onRestart, onExit, restartLabel = "Main lagi", banner, rankNote }: Props) {
  const [guideOpen, setGuideOpen] = useState(false);
  const them: PlayerIndex = me === 0 ? 1 : 0;
  const { phase, players, round } = view;
  // HP drops only when the reveal reaches the clash, not when the state arrives.
  const [impactRound, setImpactRound] = useState(0);
  const onImpact = useCallback(() => setImpactRound(round), [round]);

  const result = phase.kind === "reveal" || phase.kind === "gameOver" ? phase.result : null;
  const impacted = phase.kind === "gameOver" || impactRound === round;
  const hpOf = (i: PlayerIndex) => (result && !impacted ? result.outcome.hpBefore[i] : players[i].hp);
  const impactOf = (i: PlayerIndex): Impact | null =>
    result && impacted && phase.kind === "reveal"
      ? { id: round, damage: result.outcome.damage[i], heal: result.outcome.heal[i], blocked: result.outcome.blocked[i] }
      : null;

  const roundsToJoker = JOKER_EVERY - ((round - 1) % JOKER_EVERY);
  const status = (i: PlayerIndex) =>
    phase.kind === "turn" ? (players[i].played ? "Kartu terkunci" : `Sisa buang ${players[i].discardsLeft}x ronde ini`) : undefined;

  return (
    <LayoutGroup>
      <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-2 p-2.5 sm:gap-3 sm:p-5">
        <header className="flex items-center justify-between gap-1.5 rounded-full bg-panel p-1.5 sm:gap-2 sm:pr-2">
          <Logo />
          <div className="flex items-center gap-1.5">
            <Pill tone="light">Ronde {round}</Pill>
            <span className="hidden sm:inline">
              <Pill tone="ghost">{roundsToJoker === 1 ? "Joker setelah ronde ini" : `Joker ${roundsToJoker} ronde lagi`}</Pill>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              aria-label="Daftar kombinasi"
              className="press rounded-full bg-paper px-3 py-2 text-sm font-semibold ring-1 ring-ink/10 hover:bg-panel sm:px-3.5"
            >
              <span className="sm:hidden">Combo</span>
              <span className="max-sm:hidden">Kombinasi</span>
            </button>
            <SoundToggle />
            <button type="button" onClick={onExit} className="press rounded-full bg-ink px-3 py-2 text-sm font-semibold text-paper sm:px-4">
              Keluar
            </button>
          </div>
        </header>

        {banner}
        {phase.kind === "turn" && <RoundBanner key={round} round={round} />}
        <Sheet open={guideOpen} onClose={() => setGuideOpen(false)} title="Daftar kombinasi">
          <ComboGuide />
        </Sheet>

        <div className="grid gap-2 sm:gap-3 lg:grid-cols-[minmax(280px,340px)_1fr]">
          <div className="flex flex-col gap-3 max-lg:contents">
            <div className="max-lg:order-1">
              <PlayerPanel player={players[them]} hp={hpOf(them)} isYou={false} status={status(them)} impact={impactOf(them)} />
            </div>
            <div className="max-lg:order-3">
              <PlayerPanel player={players[me]} hp={hpOf(me)} isYou status={status(me)} impact={impactOf(me)} />
            </div>
          </div>
          <div className="flex flex-col gap-3 max-lg:contents">
            <div className="max-lg:order-2">
              {phase.kind === "jokerPick" ? (
                <JokerPicker
                  key={round}
                  player={players[me]}
                  offers={phase.offers[me]}
                  done={phase.done[me]}
                  opponentDone={phase.done[them]}
                  onPick={(jokerId, replaceIndex) => act({ type: "pickJoker", jokerId, replaceIndex })}
                />
              ) : (
                <Arena view={view} me={me} onImpact={onImpact} onContinue={() => act({ type: "continue" })} />
              )}
            </div>
            {phase.kind === "turn" && !players[me].played && (
              <div className="max-lg:order-4">
                <HandTray
                  key={round}
                  player={players[me]}
                  onDiscard={(cardIds) => act({ type: "discard", cardIds })}
                  onPlay={(cardIds) => act({ type: "play", cardIds })}
                />
              </div>
            )}
          </div>
        </div>

        {phase.kind === "gameOver" && (
          <GameOver
            outcome={phase.winner === null ? "draw" : phase.winner === me ? "win" : "lose"}
            round={round}
            hp={[players[me].hp, players[them].hp]}
            onRestart={onRestart}
            onExit={onExit}
            restartLabel={restartLabel}
            rankNote={rankNote ?? null}
            playedCards={phase.result.plays[phase.winner ?? me]}
          />
        )}
      </main>
    </LayoutGroup>
  );
}
