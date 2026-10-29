import { describe, expect, it } from "vitest";
import { resolveRound, scorePlay } from "../scoring";
import { cards } from "./helpers";

describe("scorePlay", () => {
  it("two pair of 10s and Ks: 20 + 20 card points + 30 = 70", () => {
    const score = scorePlay(cards("10S 10H KD KC"), [])!;
    expect(score.chips).toBe(40);
    expect(score.base).toBe(30);
    expect(score.total).toBe(70);
    // A kicker card doesn't score.
    expect(scorePlay(cards("10S 10H KD KC 2C"), [])!.total).toBe(70);
  });

  it("card points: 2–9 face value, 10/J/Q/K = 10, A = 11", () => {
    expect(scorePlay(cards("7S 7H"), [])!.total).toBe(20 + 14);
    expect(scorePlay(cards("JS JH"), [])!.total).toBe(20 + 20);
    expect(scorePlay(cards("AS AH"), [])!.total).toBe(20 + 22);
  });

  it("high card only scores the highest card", () => {
    expect(scorePlay(cards("KS 5H 2D"), [])!.total).toBe(10 + 10);
    expect(scorePlay(cards("AS 5H"), [])!.total).toBe(10 + 11);
  });

  it("five-card hands score every card", () => {
    expect(scorePlay(cards("2S 5S 9S JS KS"), [])!.total).toBe(50 + 36);
    expect(scorePlay(cards("5S 6H 7D 8C 9S"), [])!.total).toBe(45 + 35);
  });

  it("adds joker bonuses, then multiplies", () => {
    expect(scorePlay(cards("7S 7H"), ["pasangan_setia"])!.total).toBe(49);
    expect(scorePlay(cards("2H 5H 9H JH KH"), ["raja_hati"])!.total).toBe(111);
    // (40 + 30) * 1.5
    expect(scorePlay(cards("QS QH QD"), ["pengganda"])!.total).toBe(105);
    expect(scorePlay(cards("7S 7H"), ["pengganda"])!.total).toBe(34);
  });
});

describe("resolveRound", () => {
  it("High Card K vs spade Flush: 86 − 20 = 66 damage", () => {
    const high = scorePlay(cards("KD"), [])!.total;
    const flush = scorePlay(cards("2S 5S 9S JS KS"), [])!.total;
    const out = resolveRound([
      { hp: 100, jokers: [], score: high },
      { hp: 100, jokers: [], score: flush },
    ]);
    expect(out.winner).toBe(1);
    expect(out.damage).toEqual([66, 0]);
    expect(out.hpBefore).toEqual([100, 100]);
    expect(out.hp).toEqual([34, 100]);
  });

  it("tie deals no damage", () => {
    const out = resolveRound([
      { hp: 80, jokers: [], score: 20 },
      { hp: 50, jokers: [], score: 20 },
    ]);
    expect(out.winner).toBeNull();
    expect(out.hp).toEqual([80, 50]);
  });

  it("Tameng reduces damage, never below zero", () => {
    const out = resolveRound([
      { hp: 100, jokers: ["tameng"], score: 10 },
      { hp: 100, jokers: [], score: 50 },
    ]);
    expect(out.damage[0]).toBe(30);
    expect(out.blocked[0]).toBe(10);

    const small = resolveRound([
      { hp: 100, jokers: ["tameng"], score: 20 },
      { hp: 100, jokers: ["vampir"], score: 25 },
    ]);
    expect(small.damage[0]).toBe(0);
    expect(small.heal[1]).toBe(0); // no damage dealt, no heal
  });

  it("Vampir heals the attacker up to max HP", () => {
    const out = resolveRound([
      { hp: 70, jokers: ["vampir"], score: 50 },
      { hp: 100, jokers: [], score: 10 },
    ]);
    expect(out.hp).toEqual([75, 60]);

    const capped = resolveRound([
      { hp: 98, jokers: ["vampir"], score: 50 },
      { hp: 100, jokers: [], score: 10 },
    ]);
    expect(capped.hp[0]).toBe(100);
  });

  it("HP does not go below zero", () => {
    const out = resolveRound([
      { hp: 10, jokers: [], score: 10 },
      { hp: 100, jokers: [], score: 100 },
    ]);
    expect(out.hp[0]).toBe(0);
  });
});
