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
  icon: string;
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
    name: "Pasangan Setia",
    icon: "💞",
    description: "+15 kalau main Pair atau Two Pair",
    bonus: (hand) => (hand === "pair" || hand === "two_pair" ? 15 : 0),
  },
  pencinta_warna: {
    id: "pencinta_warna",
    name: "Pencinta Warna",
    icon: "🎨",
    description: "+25 kalau main Flush",
    bonus: (hand) => (hand === "flush" ? 25 : 0),
  },
  jalan_lurus: {
    id: "jalan_lurus",
    name: "Jalan Lurus",
    icon: "🛣️",
    description: "+20 kalau main Straight",
    bonus: (hand) => (hand === "straight" ? 20 : 0),
  },
  si_nekat: {
    id: "si_nekat",
    name: "Si Nekat",
    icon: "🎲",
    description: "+20 kalau main High Card",
    bonus: (hand) => (hand === "high_card" ? 20 : 0),
  },
  raja_hati: {
    id: "raja_hati",
    name: "Raja Hati",
    icon: "♥️",
    description: "+5 per kartu ♥ yang dimainkan",
    bonus: (_hand, cards) => cards.filter((c) => c.suit === "H").length * 5,
  },
  tameng: {
    id: "tameng",
    name: "Tameng",
    icon: "🛡️",
    description: "Damage yang kamu terima −10",
    damageReduction: 10,
  },
  vampir: {
    id: "vampir",
    name: "Vampir",
    icon: "🧛",
    description: "Pulih 5 HP tiap kali kamu memberi damage",
    healOnHit: 5,
  },
  tangan_ekstra: {
    id: "tangan_ekstra",
    name: "Tangan Ekstra",
    icon: "✋",
    description: "+1 discard tiap ronde",
    extraDiscards: 1,
  },
  pengganda: {
    id: "pengganda",
    name: "Pengganda",
    icon: "✖️",
    description: "Skor ×1.5 kalau main Three of a Kind atau lebih tinggi",
    multiplier: (hand) => (STRONG_HANDS.includes(hand) ? 1.5 : 1),
  },
};

export const JOKER_IDS = Object.keys(JOKERS) as JokerId[];

export function sumJokers(jokers: JokerId[], key: "damageReduction" | "healOnHit" | "extraDiscards") {
  return jokers.reduce((sum, id) => sum + (JOKERS[id][key] ?? 0), 0);
}
