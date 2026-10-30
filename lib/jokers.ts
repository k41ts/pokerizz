import type { Card } from "./cards";
import type { HandType } from "./hands";

export type JokerId =
  | "pasangan_setia"
  | "pencinta_warna"
  | "jalan_lurus"
  | "si_nekat"
  | "raja_hati"
  | "tameng"
  | "vampir"
  | "tangan_ekstra"
  | "pengganda";

export interface JokerDef {
  id: JokerId;
  name: string;
  description: string;
  /** Flat points added to the hand value. */
  bonus?: (hand: HandType, cards: Card[]) => number;
  /** Applied after bonuses. */
  multiplier?: (hand: HandType) => number;
  damageReduction?: number;
  healOnHit?: number;
  extraDiscards?: number;
}

const STRONG_HANDS: HandType[] = [
  "three_kind",
  "straight",
  "flush",
  "full_house",
  "four_kind",
  "straight_flush",
];

export const JOKERS: Record<JokerId, JokerDef> = {
  pasangan_setia: {
    id: "pasangan_setia",
    name: "Loyal Pair",
    description: "+15 when you play a Pair or Two Pair",
    bonus: (hand) => (hand === "pair" || hand === "two_pair" ? 15 : 0),
  },
  pencinta_warna: {
    id: "pencinta_warna",
    name: "Color Lover",
    description: "+25 when you play a Flush",
    bonus: (hand) => (hand === "flush" ? 25 : 0),
  },
  jalan_lurus: {
    id: "jalan_lurus",
    name: "Straight Road",
    description: "+20 when you play a Straight",
    bonus: (hand) => (hand === "straight" ? 20 : 0),
  },
  si_nekat: {
    id: "si_nekat",
    name: "Daredevil",
    description: "+20 when you play a High Card",
    bonus: (hand) => (hand === "high_card" ? 20 : 0),
  },
  raja_hati: {
    id: "raja_hati",
    name: "King of Hearts",
    description: "+5 for every ♥ card you play",
    bonus: (_hand, cards) => cards.filter((c) => c.suit === "H").length * 5,
  },
  tameng: {
    id: "tameng",
    name: "Shield",
    description: "You take 10 less damage",
    damageReduction: 10,
  },
  vampir: {
    id: "vampir",
    name: "Vampire",
    description: "Heal 5 HP every time you deal damage",
    healOnHit: 5,
  },
  tangan_ekstra: {
    id: "tangan_ekstra",
    name: "Extra Hand",
    description: "+1 discard every round",
    extraDiscards: 1,
  },
  pengganda: {
    id: "pengganda",
    name: "Multiplier",
    description: "Score ×1.5 on Three of a Kind or better",
    multiplier: (hand) => (STRONG_HANDS.includes(hand) ? 1.5 : 1),
  },
};

export const JOKER_IDS = Object.keys(JOKERS) as JokerId[];

export function sumJokers(jokers: JokerId[], key: "damageReduction" | "healOnHit" | "extraDiscards") {
  return jokers.reduce((sum, id) => sum + (JOKERS[id][key] ?? 0), 0);
}
