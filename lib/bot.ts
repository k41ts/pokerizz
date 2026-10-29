import type { Card, Suit } from "./cards";
import type { HandType } from "./hands";
import type { JokerId } from "./jokers";
import { scorePlay, type PlayScore } from "./scoring";
import { JOKER_SLOTS, MAX_SELECT } from "./game";

/** Bot keeps discarding while its best play scores below this. */
const GOOD_ENOUGH = 45;

function* subsets(cards: Card[], maxSize: number): Generator<Card[]> {
  const n = cards.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const pick: Card[] = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) pick.push(cards[i]);
    if (pick.length <= maxSize) yield pick;
  }
}

/** Highest-scoring play; ties go to the play using fewer cards. */
export function chooseBestPlay(hand: Card[], jokers: JokerId[]): { cards: Card[]; score: PlayScore } {
  let best: { cards: Card[]; score: PlayScore } | null = null;
  for (const cards of subsets(hand, MAX_SELECT)) {
    const score = scorePlay(cards, jokers)!;
    if (
      !best ||
      score.total > best.score.total ||
      (score.total === best.score.total && cards.length < best.cards.length)
    ) {
      best = { cards, score };
    }
  }
  return best!;
}

/** Cards to throw away, or null to stop discarding. */
export function chooseDiscard(hand: Card[], jokers: JokerId[], discardsLeft: number): Card[] | null {
  if (discardsLeft <= 0) return null;
  const best = chooseBestPlay(hand, jokers);
  if (best.score.total >= GOOD_ENOUGH) return null;

  // Keep the best combo plus the most common suit if it's a flush draw.
  const suitCount = new Map<Suit, number>();
  for (const c of hand) suitCount.set(c.suit, (suitCount.get(c.suit) ?? 0) + 1);
  const [topSuit, topCount] = [...suitCount.entries()].sort((a, b) => b[1] - a[1])[0];
  const keep = new Set(best.cards.map((c) => c.id));
  if (topCount >= 3) for (const c of hand) if (c.suit === topSuit) keep.add(c.id);

  const toss = hand
    .filter((c) => !keep.has(c.id))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, MAX_SELECT);
  return toss.length > 0 ? toss : null;
}

const BASE_JOKER_VALUE: Record<JokerId, number> = {
  tameng: 3,
  vampir: 3,
  pengganda: 2,
  tangan_ekstra: 2,
  pasangan_setia: 2,
  si_nekat: 1,
  raja_hati: 1,
  pencinta_warna: 1,
  jalan_lurus: 1,
};

const JOKER_HANDS: Partial<Record<JokerId, HandType[]>> = {
  pasangan_setia: ["pair", "two_pair"],
  pencinta_warna: ["flush"],
  jalan_lurus: ["straight"],
  si_nekat: ["high_card"],
};

function jokerValue(id: JokerId, history: Partial<Record<HandType, number>>): number {
  const played = (JOKER_HANDS[id] ?? []).reduce((s, h) => s + (history[h] ?? 0), 0);
  return BASE_JOKER_VALUE[id] + played;
}

export function chooseJoker(
  offers: JokerId[],
  owned: JokerId[],
  history: Partial<Record<HandType, number>>,
): { jokerId: JokerId | null; replaceIndex?: number } {
  if (offers.length === 0) return { jokerId: null };
  const best = [...offers].sort((a, b) => jokerValue(b, history) - jokerValue(a, history))[0];
  if (owned.length < JOKER_SLOTS) return { jokerId: best };

  const values = owned.map((id) => jokerValue(id, history));
  const worst = values.indexOf(Math.min(...values));
  return jokerValue(best, history) > values[worst]
    ? { jokerId: best, replaceIndex: worst }
    : { jokerId: null };
}
