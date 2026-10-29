import { describe, expect, it } from "vitest";
import { chooseBestPlay, chooseDiscard, chooseJoker } from "../bot";
import { createGame, gameReducer, HAND_SIZE, viewFor, type GameState, type PlayerIndex } from "../game";
import { scorePlay } from "../scoring";
import { cards } from "./helpers";

function playBest(state: GameState, player: PlayerIndex): GameState {
  const p = state.players[player];
  const best = chooseBestPlay(p.hand, p.jokers);
  return gameReducer(state, { type: "play", player, cardIds: best.cards.map((c) => c.id) });
}

describe("bot", () => {
  it("picks the highest-scoring play", () => {
    const hand = cards("2S 5S 9S JS KS 7H 7D AC");
    expect(chooseBestPlay(hand, []).score.hand).toBe("flush");
    // With Pasangan Setia, Pair 7s = 49 still loses to the Flush = 86.
    expect(chooseBestPlay(hand, ["pasangan_setia"]).score.total).toBe(86);
  });

  it("matches brute force on random hands", () => {
    let state = createGame("bot", 7);
    for (let i = 0; i < 20; i++) {
      const hand = state.players[0].hand;
      const best = chooseBestPlay(hand, []);
      for (let mask = 1; mask < 1 << hand.length; mask++) {
        const pick = hand.filter((_, j) => mask & (1 << j));
        if (pick.length > 5) continue;
        expect(scorePlay(pick, [])!.total).toBeLessThanOrEqual(best.score.total);
      }
      state = createGame("bot", i + 100);
    }
  });

  it("discards junk but keeps a flush draw", () => {
    const hand = cards("2H 6H 9H 3S 8D JC 4C KD");
    const toss = chooseDiscard(hand, [], 2)!;
    expect(toss.some((c) => c.suit === "H")).toBe(false);
    expect(toss.length).toBeGreaterThan(0);
    expect(toss.length).toBeLessThanOrEqual(5);
  });

  it("stops discarding with a good hand or no discards left", () => {
    expect(chooseDiscard(cards("QS QH QD 2C 5H 8S 9D 3C"), [], 2)).toBeNull();
    expect(chooseDiscard(cards("2H 6H 9H 3S 8D JC 4C KD"), [], 0)).toBeNull();
  });

  it("only replaces a joker for a better one", () => {
    expect(chooseJoker(["tameng"], [], {}).jokerId).toBe("tameng");
    expect(chooseJoker(["jalan_lurus"], ["tameng", "vampir", "pengganda"], {}).jokerId).toBeNull();
    expect(chooseJoker(["tameng"], ["si_nekat", "vampir", "pengganda"], {})).toEqual({
      jokerId: "tameng",
      replaceIndex: 0,
    });
  });
});

describe("game flow", () => {
  it("deals 8 cards each and both players act at once", () => {
    const state = createGame("online", 1);
    expect(state.players[0].hand).toHaveLength(HAND_SIZE);
    expect(state.players[1].hand).toHaveLength(HAND_SIZE);
    expect(state.phase).toEqual({ kind: "turn" });
  });

  it("discard swaps cards and uses a discard", () => {
    let state = createGame("online", 2);
    const ids = state.players[1].hand.slice(0, 3).map((c) => c.id);
    state = gameReducer(state, { type: "discard", player: 1, cardIds: ids });
    expect(state.players[1].hand).toHaveLength(HAND_SIZE);
    expect(state.players[1].hand.some((c) => ids.includes(c.id))).toBe(false);
    expect(state.players[1].discardsLeft).toBe(1);
    expect(state.players[0].discardsLeft).toBe(2);
    state = gameReducer(state, { type: "discard", player: 1, cardIds: [state.players[1].hand[0].id] });
    const spent = gameReducer(state, { type: "discard", player: 1, cardIds: [state.players[1].hand[0].id] });
    expect(spent).toBe(state);
  });

  it("rejects playing more than 5 cards, someone else's cards, or playing twice", () => {
    let state = createGame("bot", 3);
    const six = state.players[0].hand.slice(0, 6).map((c) => c.id);
    expect(gameReducer(state, { type: "play", player: 0, cardIds: six })).toBe(state);
    const theirs = [state.players[1].hand[0].id];
    expect(gameReducer(state, { type: "play", player: 0, cardIds: theirs })).toBe(state);
    state = gameReducer(state, { type: "play", player: 0, cardIds: [state.players[0].hand[0].id] });
    expect(gameReducer(state, { type: "play", player: 0, cardIds: [state.players[0].hand[0].id] })).toBe(state);
  });

  it("reveals once both have played and applies the difference as damage", () => {
    let state = playBest(createGame("online", 4), 1);
    expect(state.phase.kind).toBe("turn");
    state = playBest(state, 0);
    if (state.phase.kind !== "reveal") throw new Error("expected reveal");
    const { scores, outcome } = state.phase.result;
    const diff = Math.abs(scores[0].total - scores[1].total);
    expect(outcome.damage[0] + outcome.damage[1]).toBe(diff);
    expect(state.players[0].hp).toBe(100 - outcome.damage[0]);
    expect(state.players[1].hp).toBe(100 - outcome.damage[1]);
    expect(state.players[0].hand).toHaveLength(HAND_SIZE);
    expect(state.players[1].hand).toHaveLength(HAND_SIZE);

    // Next round only starts when both press continue.
    state = gameReducer(state, { type: "continue", player: 0 });
    expect(state.phase.kind).toBe("reveal");
    state = gameReducer(state, { type: "continue", player: 1 });
    expect(state.phase.kind === "turn" || state.phase.kind === "gameOver").toBe(true);
  });

  it("hides the opponent's cards until the reveal", () => {
    let state = playBest(createGame("online", 6), 0);
    const view = viewFor(state, 1);
    const real = new Set(state.players[0].hand.map((c) => c.id));
    expect(view.players[0].hand.some((c) => real.has(c.id))).toBe(false);
    expect(view.players[0].played!.every((c) => c.rank === 0)).toBe(true);
    expect(view.players[1].hand).toEqual(state.players[1].hand);
    expect(view.seed).toBe(0);

    state = playBest(state, 1);
    if (state.phase.kind !== "reveal") throw new Error("expected reveal");
    expect(viewFor(state, 1).phase).toEqual(state.phase);
  });

  it("offers jokers every 3 rounds and plays to a winner", () => {
    let sawJokerPick = false;
    for (let seed = 1; seed <= 10; seed++) {
      let state = createGame("bot", seed);
      for (let step = 0; step < 500 && state.phase.kind !== "gameOver"; step++) {
        const phase = state.phase;
        if (phase.kind === "jokerPick") {
          sawJokerPick = true;
          expect(state.round % 3).toBe(0);
          for (const i of [0, 1] as const) {
            expect(phase.offers[i]).toHaveLength(3);
            const p = state.players[i];
            state = gameReducer(state, { type: "pickJoker", player: i, ...chooseJoker(phase.offers[i], p.jokers, p.history) });
          }
        } else if (phase.kind === "reveal") {
          state = gameReducer(gameReducer(state, { type: "continue", player: 0 }), { type: "continue", player: 1 });
        } else {
          state = playBest(playBest(state, 0), 1);
        }
        // Every card is somewhere: no cards lost or duplicated.
        for (const p of state.players) {
          const inPlay = p.played && state.phase.kind === "turn" ? p.played.length : 0;
          expect(p.deck.length + p.hand.length + p.discardPile.length + inPlay).toBe(52);
        }
      }
      expect(state.phase.kind).toBe("gameOver");
      expect(state.players.some((p) => p.hp <= 0)).toBe(true);
    }
    expect(sawJokerPick).toBe(true);
  });
});
