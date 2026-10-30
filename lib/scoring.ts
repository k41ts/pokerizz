import type { Card } from "./cards";
import { EFFECTS, type EffectId } from "./effects";
import { chipValue, evaluateHand, HAND_INFO, type HandType } from "./hands";
import { JOKERS, sumJokers, type JokerId } from "./jokers";

export const MAX_HP = 100;

export interface PlayScore {
  hand: HandType;
  /** Value of the combination itself. */
  base: number;
  /** Cards forming the combination (highlighted in the reveal). */
  scoring: Card[];
  /** Every played card adds its point value, including extra cards outside the combination. */
  chips: number;
  bonuses: { jokerId: JokerId; amount: number }[];
  /** This match's effect, when it changed the score (a negative amount is a tax). */
  effect: { id: EffectId; amount: number } | null;
  multiplier: number;
  total: number;
}

/** total = (combination value + points of every played card + joker bonuses + match effect) × joker multiplier */
export function scorePlay(cards: Card[], jokers: JokerId[], effectId?: EffectId): PlayScore | null {
  const result = evaluateHand(cards);
  if (!result) return null;
  const { type: hand, scoring } = result;

  const base = HAND_INFO[hand].value;
  const chips = cards.reduce((s, c) => s + chipValue(c.rank), 0);
  const bonuses: PlayScore["bonuses"] = [];
  let multiplier = 1;
  for (const id of jokers) {
    const def = JOKERS[id];
    const amount = def.bonus?.(hand, cards) ?? 0;
    if (amount > 0) bonuses.push({ jokerId: id, amount });
    multiplier *= def.multiplier?.(hand) ?? 1;
  }
  const effectAmount = effectId ? EFFECTS[effectId].bonus(hand, cards) : 0;
  const effect = effectId && effectAmount !== 0 ? { id: effectId, amount: effectAmount } : null;
  const subtotal = base + chips + bonuses.reduce((s, b) => s + b.amount, 0) + effectAmount;
  return {
    hand,
    base,
    scoring,
    chips,
    bonuses,
    effect,
    multiplier,
    total: Math.max(0, Math.round(subtotal * multiplier)),
  };
}

export interface Side {
  hp: number;
  jokers: JokerId[];
  score: number;
}

export interface RoundOutcome {
  /** Damage received by each player, after reductions. */
  damage: [number, number];
  /** Damage each player's Tameng absorbed. */
  blocked: [number, number];
  heal: [number, number];
  /** HP before and after the round. */
  hpBefore: [number, number];
  hp: [number, number];
  /** Player with the higher score, or null on a tie. */
  winner: 0 | 1 | null;
}

/** The higher score hits the lower one for the difference. */
export function resolveRound(sides: [Side, Side]): RoundOutcome {
  const outcome: RoundOutcome = {
    damage: [0, 0],
    blocked: [0, 0],
    heal: [0, 0],
    hpBefore: [sides[0].hp, sides[1].hp],
    hp: [sides[0].hp, sides[1].hp],
    winner: null,
  };
  const diff = sides[0].score - sides[1].score;
  if (diff === 0) return outcome;

  const winner = diff > 0 ? 0 : 1;
  const loser = winner === 0 ? 1 : 0;
  const raw = Math.abs(diff);
  const damage = Math.max(0, raw - sumJokers(sides[loser].jokers, "damageReduction"));
  const heal =
    damage > 0
      ? Math.min(sumJokers(sides[winner].jokers, "healOnHit"), MAX_HP - sides[winner].hp)
      : 0;

  outcome.winner = winner;
  outcome.damage[loser] = damage;
  outcome.blocked[loser] = raw - damage;
  outcome.heal[winner] = heal;
  outcome.hp[loser] = Math.max(0, sides[loser].hp - damage);
  outcome.hp[winner] = sides[winner].hp + heal;
  return outcome;
}
