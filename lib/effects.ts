import type { Card } from "./cards";
import type { HandType } from "./hands";

/**
 * One effect is rolled per match and applies to both players from the first round to the
 * last. Unlike Jokers, nobody picks it: it changes which hands are worth chasing this match.
 */
export type EffectId =
  | "even_steven"
  | "lone_wolf"
  | "twin_flame"
  | "double_date"
  | "open_road"
  | "red_rush"
  | "royal_court"
  | "small_fry"
  | "house_tax"
  | "color_blind"
  | "humble_pie";

export interface EffectDef {
  id: EffectId;
  name: string;
  description: string;
  /** Points added to the hand value; negative for a tax. */
  bonus: (hand: HandType, cards: Card[]) => number;
}

const count = (cards: Card[], test: (c: Card) => boolean) => cards.filter(test).length;

export const EFFECTS: Record<EffectId, EffectDef> = {
  even_steven: {
    id: "even_steven",
    name: "Even Steven",
    description: "+5 for every even card you play (2, 4, 6, 8, 10)",
    bonus: (_hand, cards) => count(cards, (c) => c.rank <= 10 && c.rank % 2 === 0) * 5,
  },
  lone_wolf: {
    id: "lone_wolf",
    name: "Lone Wolf",
    description: "High Card scores +25",
    bonus: (hand) => (hand === "high_card" ? 25 : 0),
  },
  twin_flame: {
    id: "twin_flame",
    name: "Twin Flame",
    description: "Pair scores +15",
    bonus: (hand) => (hand === "pair" ? 15 : 0),
  },
  double_date: {
    id: "double_date",
    name: "Double Date",
    description: "Two Pair scores +20",
    bonus: (hand) => (hand === "two_pair" ? 20 : 0),
  },
  open_road: {
    id: "open_road",
    name: "Open Road",
    description: "Straight scores +25",
    bonus: (hand) => (hand === "straight" ? 25 : 0),
  },
  red_rush: {
    id: "red_rush",
    name: "Red Rush",
    description: "+4 for every ♥ or ♦ card you play",
    bonus: (_hand, cards) => count(cards, (c) => c.suit === "H" || c.suit === "D") * 4,
  },
  royal_court: {
    id: "royal_court",
    name: "Royal Court",
    description: "+4 for every J, Q and K you play",
    bonus: (_hand, cards) => count(cards, (c) => c.rank >= 11 && c.rank <= 13) * 4,
  },
  small_fry: {
    id: "small_fry",
    name: "Small Fry",
    description: "+5 for every 2, 3, 4 and 5 you play",
    bonus: (_hand, cards) => count(cards, (c) => c.rank <= 5) * 5,
  },
  house_tax: {
    id: "house_tax",
    name: "House Tax",
    description: "Full House scores −30",
    bonus: (hand) => (hand === "full_house" ? -30 : 0),
  },
  color_blind: {
    id: "color_blind",
    name: "Color Blind",
    description: "Flush scores −25",
    bonus: (hand) => (hand === "flush" ? -25 : 0),
  },
  humble_pie: {
    id: "humble_pie",
    name: "Humble Pie",
    description: "Four of a Kind and Straight Flush score −40",
    bonus: (hand) => (hand === "four_kind" || hand === "straight_flush" ? -40 : 0),
  },
};

export const EFFECT_IDS = Object.keys(EFFECTS) as EffectId[];
