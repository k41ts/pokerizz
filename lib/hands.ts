import type { Card } from "./cards";

export const HAND_TYPES = [
  "high_card",
  "pair",
  "two_pair",
  "three_kind",
  "straight",
  "flush",
  "full_house",
  "four_kind",
  "straight_flush",
] as const;

export type HandType = (typeof HAND_TYPES)[number];

export const HAND_INFO: Record<HandType, { label: string; value: number }> = {
  high_card: { label: "High Card", value: 10 },
  pair: { label: "Pair", value: 20 },
  two_pair: { label: "Two Pair", value: 30 },
  three_kind: { label: "Three of a Kind", value: 40 },
  straight: { label: "Straight", value: 45 },
  flush: { label: "Flush", value: 50 },
  full_house: { label: "Full House", value: 60 },
  four_kind: { label: "Four of a Kind", value: 80 },
  straight_flush: { label: "Straight Flush", value: 100 },
};

/** Points a scoring card adds: 2–9 face value, 10/J/Q/K = 10, A = 11. */
export function chipValue(rank: number): number {
  if (rank === 14) return 11;
  return Math.min(rank, 10);
}

export interface HandResult {
  type: HandType;
  /** Cards that form the combination; only these add their chip value. */
  scoring: Card[];
}

function isRun(ranks: number[]): boolean {
  const sorted = [...ranks].sort((a, b) => a - b);
  if (sorted.join() === "2,3,4,5,14") return true; // A-2-3-4-5
  return sorted[4] - sorted[0] === 4;
}

/** Best poker hand formed by the played cards (1–5 cards). Straight and Flush need all 5. */
export function evaluateHand(cards: Card[]): HandResult | null {
  if (cards.length === 0 || cards.length > 5) return null;

  const byRank = new Map<number, Card[]>();
  for (const c of cards) byRank.set(c.rank, [...(byRank.get(c.rank) ?? []), c]);
  // Biggest groups first, higher rank breaks ties.
  const groups = [...byRank.values()].sort(
    (a, b) => b.length - a.length || b[0].rank - a[0].rank,
  );
  const sizes = groups.map((g) => g.length);

  const flush = cards.length === 5 && cards.every((c) => c.suit === cards[0].suit);
  const straight =
    cards.length === 5 && groups.length === 5 && isRun(cards.map((c) => c.rank));

  if (straight && flush) return { type: "straight_flush", scoring: cards };
  if (sizes[0] === 4) return { type: "four_kind", scoring: groups[0] };
  if (sizes[0] === 3 && sizes[1] === 2) return { type: "full_house", scoring: cards };
  if (flush) return { type: "flush", scoring: cards };
  if (straight) return { type: "straight", scoring: cards };
  if (sizes[0] === 3) return { type: "three_kind", scoring: groups[0] };
  if (sizes[0] === 2 && sizes[1] === 2)
    return { type: "two_pair", scoring: [...groups[0], ...groups[1]] };
  if (sizes[0] === 2) return { type: "pair", scoring: groups[0] };
  return { type: "high_card", scoring: groups[0] };
}
