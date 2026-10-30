import { describe, expect, it } from "vitest";
import { chooseBestPlay } from "../bot";
import { matchCallout, roundCallout } from "../callouts";
import { EFFECT_IDS } from "../effects";
import { createGame, gameReducer, type GameState, type PlayerIndex } from "../game";
import { scorePlay } from "../scoring";
import { cards } from "./helpers";

describe("match effects", () => {
  it("taxes a Full House under House Tax", () => {
    const plain = scorePlay(cards("3S 3D 3H 8C 8S"), [])!.total;
    const taxed = scorePlay(cards("3S 3D 3H 8C 8S"), [], "house_tax")!;
    expect(taxed.total).toBe(plain - 30);
    expect(taxed.effect).toEqual({ id: "house_tax", amount: -30 });
  });

  it("pays +5 per even card under Even Steven, before Joker multipliers", () => {
    // 2, 4, 10 are even; K and A are not.
    expect(scorePlay(cards("2S 4H 10D KC AS"), [], "even_steven")!.effect?.amount).toBe(15);
    expect(scorePlay(cards("QS QH QD"), ["pengganda"], "royal_court")!.total).toBe(Math.round((40 + 30 + 12) * 1.5));
  });

  it("leaves the score alone when the effect doesn't apply", () => {
    expect(scorePlay(cards("7S 7H"), [], "house_tax")!.effect).toBeNull();
  });

  it("never lets a tax push a score below zero", () => {
    expect(scorePlay(cards("2S"), [], "house_tax")!.total).toBeGreaterThanOrEqual(0);
  });

  it("rolls one effect per match from the seed", () => {
    const a = createGame("online", 42);
    expect(EFFECT_IDS).toContain(a.effect);
    expect(createGame("online", 42).effect).toBe(a.effect);
    const seen = new Set(Array.from({ length: 60 }, (_, i) => createGame("online", i).effect));
    expect(seen.size).toBeGreaterThan(5);
  });

  it("makes the bot avoid a taxed hand when something else scores more", () => {
    // Full House 3s over 8s = 60 + 25 = 85, taxed to 55. Three 3s + 9 + 8 = 40 + 26 = 66 wins instead.
    const hand = cards("3S 3D 3H 8C 8S 2C 5D 9H");
    expect(chooseBestPlay(hand, []).score.hand).toBe("full_house");
    expect(chooseBestPlay(hand, [], "house_tax").score.hand).toBe("three_kind");
    expect(chooseBestPlay(hand, [], "house_tax").score.total).toBe(66);
  });
});

describe("round log", () => {
  function playFirst(state: GameState, player: PlayerIndex, n: number): GameState {
    const ids = state.players[player].hand.slice(0, n).map((c) => c.id);
    return gameReducer(state, { type: "play", player, cardIds: ids });
  }

  it("records who dealt damage each round", () => {
    let state = createGame("online", 5);
    state = playFirst(state, 0, 5);
    state = playFirst(state, 1, 1);
    expect(state.phase.kind).toBe("reveal");
    if (state.phase.kind !== "reveal") return;
    const { winner, damage } = state.phase.result.outcome;
    const expected = winner !== null && damage[winner === 0 ? 1 : 0] > 0 ? winner : null;
    expect(state.log).toEqual([expected]);
  });
});

describe("callouts", () => {
  it("calls a shutdown when a 3-hit streak is broken", () => {
    expect(roundCallout([0, 0, 0, 1])).toEqual({ kind: "shutdown", by: 1, streak: 3 });
    expect(roundCallout([0, 0, 1])).toBeNull();
    expect(roundCallout([0, 0, 0, null])).toBeNull();
    expect(roundCallout([0, 0, 0, 0])).toBeNull();
  });

  it("calls legendary when the winner never took a hit", () => {
    expect(matchCallout([0, null, 0, 0], 0)).toEqual({ kind: "legendary", winner: 0 });
  });

  it("calls an epic comeback when the loser had a streak", () => {
    expect(matchCallout([1, 1, 1, 0, 0, 0, 0], 0)).toEqual({ kind: "comeback", winner: 0 });
    expect(matchCallout([1, 1, 0, 0, 0], 0)).toBeNull();
  });
});
