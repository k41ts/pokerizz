import { card, type Suit } from "../cards";

/** "AS KH 10D" -> cards */
export function cards(spec: string) {
  const ranks: Record<string, number> = { J: 11, Q: 12, K: 13, A: 14 };
  return spec.split(" ").map((s) => {
    const r = s.slice(0, -1);
    return card(ranks[r] ?? Number(r), s.slice(-1) as Suit);
  });
}
