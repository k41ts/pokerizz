import type { PlayerIndex } from "./game";

/** Hits in a row it takes to count as a streak. */
export const STREAK = 3;

export type RoundCallout = { kind: "shutdown"; by: PlayerIndex; streak: number };
export type MatchCallout = { kind: "legendary" | "comeback"; winner: PlayerIndex };

/** How many rounds in a row `player` dealt damage, ending at round index `end`. */
function streakEnding(log: (PlayerIndex | null)[], player: PlayerIndex, end: number): number {
  let n = 0;
  for (let i = end; i >= 0 && log[i] === player; i--) n++;
  return n;
}

/** The latest round ended someone's streak of 3+ hits. */
export function roundCallout(log: (PlayerIndex | null)[] | undefined): RoundCallout | null {
  if (!log || log.length < STREAK + 1) return null;
  const last = log.length - 1;
  const by = log[last];
  if (by === null) return null;
  const other: PlayerIndex = by === 0 ? 1 : 0;
  const streak = streakEnding(log, other, last - 1);
  return streak >= STREAK ? { kind: "shutdown", by, streak } : null;
}

/** The longest run of hits `player` had at any point. */
export function longestStreak(log: (PlayerIndex | null)[], player: PlayerIndex): number {
  let best = 0;
  for (let i = 0; i < log.length; i++) best = Math.max(best, streakEnding(log, player, i));
  return best;
}

/**
 * Legendary: the winner never took a hit. Epic comeback: the loser had a 3+ hit
 * streak at some point and still lost.
 */
export function matchCallout(log: (PlayerIndex | null)[] | undefined, winner: PlayerIndex | null): MatchCallout | null {
  if (!log || winner === null) return null;
  const loser: PlayerIndex = winner === 0 ? 1 : 0;
  if (!log.includes(loser)) return { kind: "legendary", winner };
  if (longestStreak(log, loser) >= STREAK) return { kind: "comeback", winner };
  return null;
}
