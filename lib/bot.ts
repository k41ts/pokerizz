import type { Card, Suit } from "./cards";
import type { HandType } from "./hands";
import type { EffectId } from "./effects";
import type { JokerId } from "./jokers";
import { scorePlay, type PlayScore } from "./scoring";
import { JOKER_SLOTS, MAX_SELECT } from "./game";

/** Bot keeps discarding while its best combination is worth less than this (Two Pair = 30). */
const GOOD_ENOUGH = 30;

function* subsets(cards: Card[], maxSize: number): Generator<Card[]> {
  const n = cards.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const pick: Card[] = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) pick.push(cards[i]);
    if (pick.length <= maxSize) yield pick;
  }
}

/** Highest-scoring play; ties go to the play using fewer cards. */
export function chooseBestPlay(hand: Card[], jokers: JokerId[], effect?: EffectId): { cards: Card[]; score: PlayScore } {
  let best: { cards: Card[]; score: PlayScore } | null = null;
  for (const cards of subsets(hand, MAX_SELECT)) {
    const score = scorePlay(cards, jokers, effect)!;
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
export function chooseDiscard(hand: Card[], jokers: JokerId[], discardsLeft: number, effect?: EffectId): Card[] | null {
  if (discardsLeft <= 0) return null;
  const best = chooseBestPlay(hand, jokers, effect);
  if (best.score.base >= GOOD_ENOUGH) return null;

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

/**
 * 0 Rookie … 4 Diamond. Higher levels never see hidden information: they only know
 * which cards are left in their own deck, not in what order.
 */
export type BotLevel = 0 | 1 | 2 | 3 | 4;

export type BotMove = { kind: "discard"; cards: Card[] } | { kind: "play"; cards: Card[] };

const SAMPLES: Record<BotLevel, number> = { 0: 0, 1: 0, 2: 0, 3: 24, 4: 48 };
/** How much better (in expected points) a discard must look before the bot takes it. */
const MARGIN: Record<BotLevel, number> = { 0: 0, 1: 0, 2: 0, 3: 4, 4: 1 };
/** How often a bot weighs its discards with sampling; otherwise it falls back to the simple rule. */
const DEEP_CHANCE: Record<BotLevel, number> = { 0: 0, 1: 0, 2: 0, 3: 0.3, 4: 0.6 };

function chips(c: Card) {
  return c.rank === 14 ? 11 : Math.min(c.rank, 10);
}

/** Sets of cards worth holding on to: the current combo, a flush draw, a straight draw, pairs, high cards. */
function keepCandidates(hand: Card[], best: Card[]): Card[][] {
  const byValue = [...hand].sort((a, b) => chips(b) - chips(a) || b.rank - a.rank);
  const candidates: Card[][] = [best];

  const bySuit = new Map<Suit, Card[]>();
  for (const c of hand) bySuit.set(c.suit, [...(bySuit.get(c.suit) ?? []), c]);
  for (const group of bySuit.values()) if (group.length >= 3) candidates.push(group);

  // Straight draws: one card per rank inside any 5-rank window (ace counts low too).
  for (let low = 1; low <= 10; low++) {
    const window: Card[] = [];
    for (let r = low; r < low + 5; r++) {
      const rank = r === 1 ? 14 : r;
      const card = hand.find((c) => c.rank === rank);
      if (card) window.push(card);
    }
    if (window.length >= 3) candidates.push(window);
  }

  const counts = new Map<number, number>();
  for (const c of hand) counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1);
  const sets = hand.filter((c) => (counts.get(c.rank) ?? 0) >= 2);
  if (sets.length > 0) candidates.push(sets);
  candidates.push(byValue.slice(0, 3));

  // A discard throws away 1–5 cards, so a keep set holds 3–7 of the 8.
  return candidates.map((keep) => {
    const ids = new Set(keep.map((c) => c.id));
    const filled = [...keep];
    for (const c of byValue) {
      if (filled.length >= 3) break;
      if (!ids.has(c.id)) filled.push(c);
    }
    return filled.slice(0, 7);
  });
}

function sample<T>(pool: T[], n: number): T[] {
  const copy = [...pool];
  for (let i = 0; i < n && i < copy.length; i++) {
    const j = i + Math.floor(Math.random() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

/** Average best score after keeping `keep` and drawing the rest from `pool`. */
function expectedBest(keep: Card[], pool: Card[], handSize: number, jokers: JokerId[], samples: number, effect?: EffectId): number {
  const need = handSize - keep.length;
  let total = 0;
  for (let i = 0; i < samples; i++) total += chooseBestPlay([...keep, ...sample(pool, need)], jokers, effect).score.total;
  return total / samples;
}

/**
 * One decision for a bot: discard (it will be asked again) or play.
 * `pool` is the cards the bot could draw: its own deck, order unknown.
 */
export function botMove(
  hand: Card[],
  jokers: JokerId[],
  discardsLeft: number,
  pool: Card[],
  level: BotLevel,
  effect?: EffectId,
): BotMove {
  const best = chooseBestPlay(hand, jokers, effect);

  if (level === 0) {
    // Beginners often miss their best hand.
    if (Math.random() < 0.45) {
      const n = 1 + Math.floor(Math.random() * 3);
      return { kind: "play", cards: sample(hand, n) };
    }
    return { kind: "play", cards: best.cards };
  }
  if (level === 1 || discardsLeft <= 0) return { kind: "play", cards: best.cards };
  if (level === 2 || Math.random() >= DEEP_CHANCE[level]) {
    const toss = chooseDiscard(hand, jokers, discardsLeft, effect);
    return toss ? { kind: "discard", cards: toss } : { kind: "play", cards: best.cards };
  }

  if (pool.length === 0) return { kind: "play", cards: best.cards };
  const baseline = best.score.total;
  let bestKeep: Card[] | null = null;
  let bestValue = baseline + MARGIN[level];
  for (const keep of keepCandidates(hand, best.cards)) {
    if (keep.length >= hand.length) continue;
    const value = expectedBest(keep, pool, hand.length, jokers, SAMPLES[level], effect);
    if (value > bestValue) {
      bestValue = value;
      bestKeep = keep;
    }
  }
  if (!bestKeep) return { kind: "play", cards: best.cards };
  const keepIds = new Set(bestKeep.map((c) => c.id));
  return { kind: "discard", cards: hand.filter((c) => !keepIds.has(c.id)).slice(0, MAX_SELECT) };
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
