export type Suit = "S" | "H" | "D" | "C";

export interface Card {
  id: string;
  /** 2–14, where 11 = J, 12 = Q, 13 = K, 14 = A */
  rank: number;
  suit: Suit;
}

export const SUITS: Suit[] = ["S", "H", "D", "C"];

export const SUIT_SYMBOL: Record<Suit, string> = {
  S: "♠",
  H: "♥",
  D: "♦",
  C: "♣",
};

export const RED_SUITS: Suit[] = ["H", "D"];

export function rankLabel(rank: number): string {
  if (rank === 11) return "J";
  if (rank === 12) return "Q";
  if (rank === 13) return "K";
  if (rank === 14) return "A";
  return String(rank);
}

export function card(rank: number, suit: Suit): Card {
  return { id: `${rank}${suit}`, rank, suit };
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank++) deck.push(card(rank, suit));
  }
  return deck;
}

export interface Rng {
  next(): number;
  readonly seed: number;
}

/** Small seeded RNG (mulberry32) so the game reducer stays pure and replayable. */
export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  return {
    next() {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    get seed() {
      return s;
    },
  };
}

export function shuffle<T>(items: T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function sortHand(cards: Card[]): Card[] {
  return [...cards].sort(
    (a, b) => b.rank - a.rank || SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit),
  );
}
