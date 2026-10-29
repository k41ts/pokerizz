import { createDeck, createRng, shuffle, type Card, type Rng } from "./cards";
import type { HandType } from "./hands";
import { JOKER_IDS, sumJokers, type JokerId } from "./jokers";
import { MAX_HP, resolveRound, scorePlay, type PlayScore, type RoundOutcome } from "./scoring";

export type PlayerIndex = 0 | 1;
export type Mode = "online" | "bot";

export const HAND_SIZE = 8;
export const BASE_DISCARDS = 2;
export const MAX_SELECT = 5;
export const JOKER_SLOTS = 3;
export const JOKER_EVERY = 3;
export const JOKER_OFFERS = 3;

export interface PlayerState {
  name: string;
  isBot: boolean;
  hp: number;
  deck: Card[];
  hand: Card[];
  discardPile: Card[];
  jokers: JokerId[];
  discardsLeft: number;
  played: Card[] | null;
  history: Partial<Record<HandType, number>>;
}

export interface RoundResult {
  plays: [Card[], Card[]];
  scores: [PlayScore, PlayScore];
  outcome: RoundOutcome;
}

/** Both players act at the same time in every phase. */
export type Phase =
  | { kind: "turn" }
  | { kind: "reveal"; result: RoundResult; ready: [boolean, boolean] }
  | { kind: "jokerPick"; offers: [JokerId[], JokerId[]]; done: [boolean, boolean] }
  | { kind: "gameOver"; winner: PlayerIndex | null; result: RoundResult };

export interface GameState {
  mode: Mode;
  round: number;
  seed: number;
  players: [PlayerState, PlayerState];
  phase: Phase;
}

export type GameAction =
  | { type: "discard"; player: PlayerIndex; cardIds: string[] }
  | { type: "play"; player: PlayerIndex; cardIds: string[] }
  | { type: "continue"; player: PlayerIndex }
  | { type: "pickJoker"; player: PlayerIndex; jokerId: JokerId | null; replaceIndex?: number };

function refill(p: PlayerState, rng: Rng): PlayerState {
  let deck = p.deck;
  let discardPile = p.discardPile;
  const hand = [...p.hand];
  while (hand.length < HAND_SIZE) {
    if (deck.length === 0) {
      if (discardPile.length === 0) break;
      deck = shuffle(discardPile, rng);
      discardPile = [];
    }
    hand.push(deck[0]);
    deck = deck.slice(1);
  }
  return { ...p, deck, discardPile, hand };
}

function newPlayer(name: string, isBot: boolean, rng: Rng): PlayerState {
  return refill(
    {
      name,
      isBot,
      hp: MAX_HP,
      deck: shuffle(createDeck(), rng),
      hand: [],
      discardPile: [],
      jokers: [],
      discardsLeft: BASE_DISCARDS,
      played: null,
      history: {},
    },
    rng,
  );
}

function setPlayer(
  players: [PlayerState, PlayerState],
  i: PlayerIndex,
  p: PlayerState,
): [PlayerState, PlayerState] {
  return i === 0 ? [p, players[1]] : [players[0], p];
}

function startRound(state: GameState, round: number): GameState {
  const players = state.players.map((p) => ({
    ...p,
    played: null,
    discardsLeft: BASE_DISCARDS + sumJokers(p.jokers, "extraDiscards"),
  })) as [PlayerState, PlayerState];
  return { ...state, round, players, phase: { kind: "turn" } };
}

function rollOffers(owned: JokerId[], rng: Rng): JokerId[] {
  return shuffle(
    JOKER_IDS.filter((id) => !owned.includes(id)),
    rng,
  ).slice(0, JOKER_OFFERS);
}

export function createGame(mode: Mode, seed: number, names: [string, string] = ["Kamu", "Bot"]): GameState {
  const rng = createRng(seed);
  const p1 = newPlayer(names[0], false, rng);
  const p2 = newPlayer(names[1], mode === "bot", rng);
  return startRound({ mode, round: 1, seed: rng.seed, players: [p1, p2], phase: { kind: "turn" } }, 1);
}

function pickCards(hand: Card[], ids: string[]): Card[] | null {
  const unique = new Set(ids);
  const picked = hand.filter((c) => unique.has(c.id));
  return picked.length === unique.size && picked.length > 0 ? picked : null;
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  const { phase } = state;
  const rng = createRng(state.seed);
  const who = action.player;

  switch (action.type) {
    case "discard": {
      if (phase.kind !== "turn") return state;
      const p = state.players[who];
      const picked = pickCards(p.hand, action.cardIds);
      if (p.played || !picked || picked.length > MAX_SELECT || p.discardsLeft <= 0) return state;
      const next = refill(
        {
          ...p,
          hand: p.hand.filter((c) => !picked.includes(c)),
          discardPile: [...p.discardPile, ...picked],
          discardsLeft: p.discardsLeft - 1,
        },
        rng,
      );
      return { ...state, seed: rng.seed, players: setPlayer(state.players, who, next) };
    }

    case "play": {
      if (phase.kind !== "turn") return state;
      const p = state.players[who];
      const picked = pickCards(p.hand, action.cardIds);
      if (p.played || !picked || picked.length > MAX_SELECT) return state;
      const players = setPlayer(state.players, who, {
        ...p,
        hand: p.hand.filter((c) => !picked.includes(c)),
        played: picked,
      });
      if (!players[0].played || !players[1].played) return { ...state, players };
      return reveal({ ...state, players }, rng);
    }

    case "continue": {
      if (phase.kind !== "reveal" || phase.ready[who]) return state;
      const ready = setFlag(phase.ready, who);
      if (!ready[0] || !ready[1]) return { ...state, phase: { ...phase, ready } };

      const [a, b] = state.players;
      if (a.hp <= 0 || b.hp <= 0) {
        const winner: PlayerIndex | null = a.hp === b.hp ? null : a.hp > b.hp ? 0 : 1;
        return { ...state, phase: { kind: "gameOver", winner, result: phase.result } };
      }
      if (state.round % JOKER_EVERY === 0) {
        const offers: [JokerId[], JokerId[]] = [rollOffers(a.jokers, rng), rollOffers(b.jokers, rng)];
        return { ...state, seed: rng.seed, phase: { kind: "jokerPick", offers, done: [false, false] } };
      }
      return startRound(state, state.round + 1);
    }

    case "pickJoker": {
      if (phase.kind !== "jokerPick" || phase.done[who]) return state;
      const p = state.players[who];
      let jokers = p.jokers;
      const id = action.jokerId;
      if (id && phase.offers[who].includes(id)) {
        if (jokers.length < JOKER_SLOTS) {
          jokers = [...jokers, id];
        } else if (action.replaceIndex !== undefined && jokers[action.replaceIndex]) {
          jokers = jokers.map((j, i) => (i === action.replaceIndex ? id : j));
        }
      }
      const players = setPlayer(state.players, who, { ...p, jokers });
      const done = setFlag(phase.done, who);
      if (!done[0] || !done[1]) return { ...state, players, phase: { ...phase, done } };
      return startRound({ ...state, players }, state.round + 1);
    }
  }
}

function setFlag(flags: [boolean, boolean], i: PlayerIndex): [boolean, boolean] {
  return i === 0 ? [true, flags[1]] : [flags[0], true];
}

function reveal(state: GameState, rng: Rng): GameState {
  const [a, b] = state.players;
  const plays: [Card[], Card[]] = [a.played!, b.played!];
  const scores: [PlayScore, PlayScore] = [
    scorePlay(plays[0], a.jokers)!,
    scorePlay(plays[1], b.jokers)!,
  ];
  const outcome = resolveRound([
    { hp: a.hp, jokers: a.jokers, score: scores[0].total },
    { hp: b.hp, jokers: b.jokers, score: scores[1].total },
  ]);

  const players = state.players.map((p, i) =>
    refill(
      {
        ...p,
        hp: outcome.hp[i],
        discardPile: [...p.discardPile, ...plays[i]],
        history: { ...p.history, [scores[i].hand]: (p.history[scores[i].hand] ?? 0) + 1 },
      },
      rng,
    ),
  ) as [PlayerState, PlayerState];

  return {
    ...state,
    seed: rng.seed,
    players,
    phase: { kind: "reveal", result: { plays, scores, outcome }, ready: [false, false] },
  };
}

const HIDDEN: Card = { id: "hidden", rank: 0, suit: "S" };

function hide(cards: Card[]): Card[] {
  return cards.map((_, i) => ({ ...HIDDEN, id: `hidden-${i}` }));
}

/**
 * What player `viewer` is allowed to see: the opponent's hand, deck and locked
 * cards are replaced by blanks until the reveal. Used before sending state online.
 */
export function viewFor(state: GameState, viewer: PlayerIndex): GameState {
  const other: PlayerIndex = viewer === 0 ? 1 : 0;
  const p = state.players[other];
  const masked: PlayerState = {
    ...p,
    deck: hide(p.deck),
    hand: hide(p.hand),
    discardPile: hide(p.discardPile),
    played: p.played && state.phase.kind === "turn" ? hide(p.played) : p.played,
  };
  const phase =
    state.phase.kind === "jokerPick"
      ? { ...state.phase, offers: setOffers(state.phase.offers, other, []) }
      : state.phase;
  return { ...state, seed: 0, phase, players: setPlayer(state.players, other, masked) };
}

function setOffers(offers: [JokerId[], JokerId[]], i: PlayerIndex, value: JokerId[]): [JokerId[], JokerId[]] {
  return i === 0 ? [value, offers[1]] : [offers[0], value];
}
