"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { finishBotMatch, recordMatchStats, reportLoss, startBotMatch } from "@/lib/account";
import { botMove, chooseJoker, type BotLevel } from "@/lib/bot";
import { createGame, gameReducer, viewFor, type GameAction, type GameState, type PlayerIndex } from "@/lib/game";
import { send, type Link } from "@/lib/net";
import { clearMatch, saveMatch } from "@/lib/resume";
import { play } from "@/lib/sound";
import Game, { TURN_SECONDS, type LocalAction, type RankNote } from "./Game";
import { PrimaryButton } from "./ui";

const TRAINING_DELAY = 900;
/** Extra time the host allows the guest before playing a card for them. */
const GUEST_GRACE = 4;

/** What a finished match adds toward achievements, for player `me`. */
function statsFor(view: GameState, me: PlayerIndex, winner: PlayerIndex | null) {
  const other: PlayerIndex = me === 0 ? 1 : 0;
  return {
    fullHouses: view.players[me].history.full_house ?? 0,
    flawless: winner === me && !(view.log ?? []).includes(other),
  };
}

function newSeed() {
  return Math.floor(Math.random() * 2 ** 32);
}

function between(min: number, max: number) {
  return min + Math.random() * (max - min);
}

type Reset = { type: "reset"; state: GameState };
function hostReducer(state: GameState, action: GameAction | Reset): GameState {
  return action.type === "reset" ? action.state : gameReducer(state, action);
}

export type BotOpponent =
  | { kind: "training" }
  /** From matchmaking: looks like any player, plays at the level of the player's rank. */
  | { kind: "ranked"; name: string; skin: string; level: BotLevel; signedIn: boolean };

/** One game against a bot. Training is relaxed; ranked has a timer and counts for stars. */
export function BotMatch({
  name,
  skin,
  title,
  opponent,
  onExit,
  onSearchAgain,
  onRanked,
  resume,
}: {
  name: string;
  skin: string;
  title: string | null;
  opponent: BotOpponent;
  onExit: () => void;
  onSearchAgain?: () => void;
  onRanked?: () => void;
  /** A game saved before the page reloaded. */
  resume?: { state: GameState; botMatchId: string | null };
}) {
  const ranked = opponent.kind === "ranked";
  const level: BotLevel = ranked ? opponent.level : 2;
  const names: [string, string] = [name, ranked ? opponent.name : "Bot"];
  const newGame = useCallback(() => {
    const g = createGame("bot", newSeed(), names);
    // A matchmaking bot is shown like any other player.
    if (ranked) g.players[1] = { ...g.players[1], isBot: false };
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- names only change with a new match
  }, [ranked, names[0], names[1]]);
  const [state, dispatch] = useReducer(hostReducer, undefined, () => resume?.state ?? newGame());
  const { phase, players } = state;
  const bot = players[1];

  useEffect(() => {
    let act: (() => void) | null = null;
    let delay = TRAINING_DELAY;
    if (phase.kind === "turn" && !bot.played) {
      const move = botMove(bot.hand, bot.jokers, bot.discardsLeft, bot.deck, level, state.effect);
      // Ranked bots take human-like time, always inside the turn timer.
      if (ranked) delay = move.kind === "discard" ? between(1500, 3000) : between(2500, 6500);
      act = () => dispatch({ type: move.kind, player: 1, cardIds: move.cards.map((c) => c.id) });
    } else if (phase.kind === "reveal" && !phase.ready[1]) {
      dispatch({ type: "continue", player: 1 });
    } else if (phase.kind === "jokerPick" && !phase.done[1]) {
      if (ranked) delay = between(1500, 4000);
      act = () => dispatch({ type: "pickJoker", player: 1, ...chooseJoker(phase.offers[1], bot.jokers, bot.history) });
    }
    if (!act) return;
    const t = setTimeout(act, delay);
    return () => clearTimeout(t);
  }, [phase, bot, level, ranked, state.effect]);

  // Ranked: register the match when it starts, report the result when it ends.
  const matchId = useRef<Promise<string | null> | null>(resume?.botMatchId ? Promise.resolve(resume.botMatchId) : null);
  const savedMatchId = useRef<string | null>(resume?.botMatchId ?? null);
  const [note, setNote] = useState<RankNote | null>(null);
  const signedIn = ranked && opponent.signedIn;
  // A ranked bot match is one game; "play again" searches for a new opponent.
  useEffect(() => {
    if (!signedIn || matchId.current) return;
    matchId.current = startBotMatch(level);
    void matchId.current.then((id) => (savedMatchId.current = id));
  }, [signedIn, level]);

  // Saved on every move so a reload picks up right here; a finished game is forgotten.
  useEffect(() => {
    if (state.phase.kind === "gameOver") clearMatch();
    else saveMatch({ kind: "bot", state, opponent, botMatchId: savedMatchId.current });
  }, [state, opponent]);

  const winner = phase.kind === "gameOver" ? phase.winner : undefined;
  useEffect(() => {
    if (winner === undefined) return;
    if (!ranked) return;
    if (!signedIn) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- result text for this game
      setNote({ kind: "unranked", text: "Sign in to earn stars and points from wins." });
      return;
    }
    const pending = matchId.current;
    matchId.current = null;
    if (winner === null || !pending) {
      setNote({ kind: "unranked", text: "Draw, no stars." });
      return;
    }
    const stats = statsFor(state, 0, winner);
    void pending.then(async (id) => {
      const delta = id ? await finishBotMatch(id, winner === 0) : null;
      if (id && delta !== null) await recordMatchStats(id, stats.fullHouses, stats.flawless);
      if (delta === null) setNote({ kind: "unranked", text: "This game didn't count (too short, or daily limit reached)." });
      else if (winner === 0) setNote({ kind: "star", text: "+1 star · +30 points" });
      else setNote({ kind: "loss", text: delta < 0 ? "−1 star · +10 points" : "+10 points" });
      onRanked?.();
    });
    // Stats are read once, when the match ends.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner, ranked, signedIn, onRanked]);

  return (
    <Game
      view={viewFor(state, 0)}
      me={0}
      act={(a) => dispatch({ ...a, player: 0 } as GameAction)}
      onRestart={() => {
        if (ranked && onSearchAgain) return onSearchAgain();
        setNote(null);
        dispatch({ type: "reset", state: newGame() });
      }}
      restartLabel={ranked ? "Find another match" : "Play again"}
      onExit={onExit}
      rankNote={note}
      skins={[skin, ranked ? opponent.skin : "classic"]}
      titles={[title, null]}
      turnSeconds={ranked ? TURN_SECONDS : undefined}
    />
  );
}

interface Meta {
  matchId: string;
  userIds: [string | null, string | null];
  skins: [string, string];
  titles: [string | null, string | null];
}

/**
 * Ranked when both players are signed in. The loser's device reports the result,
 * and the server gives the winner one star.
 */
function useRankNote(view: GameState | null, me: PlayerIndex, meta: Meta | null, onRanked: () => void): RankNote | null {
  const reported = useRef<string | null>(null);
  const phase = view?.phase;
  const winner = phase?.kind === "gameOver" ? phase.winner : undefined;
  const ranked = !!meta && meta.userIds[0] !== null && meta.userIds[1] !== null;

  useEffect(() => {
    if (winner === undefined || !meta || !ranked || reported.current === meta.matchId) return;
    reported.current = meta.matchId;
    const stats = statsFor(view!, me, winner);
    const record = () => recordMatchStats(meta.matchId, stats.fullHouses, stats.flawless);
    if (winner === null) {
      void record().then(onRanked);
      return;
    }
    if (winner !== me) {
      void reportLoss(meta.matchId, meta.userIds[winner]!)
        .then(record)
        .then(onRanked);
    } else {
      void record();
      // The other device reports; give it a moment before reloading our stars.
      const t = setTimeout(onRanked, 2500);
      return () => clearTimeout(t);
    }
    // Stats are read once, when the match ends.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner, meta, ranked, me, onRanked]);

  if (winner === undefined) return null;
  if (!ranked) return { kind: "unranked", text: "Both players need an account for wins to earn stars and points." };
  if (winner === null) return { kind: "unranked", text: "Draw, no stars." };
  return winner === me ? { kind: "star", text: "+1 star · +30 points" } : { kind: "loss", text: "−1 star · +10 points" };
}

function newMatchId() {
  return crypto.randomUUID();
}

function LinkBanner({ status, onExit }: { status: LinkStatus; onExit: () => void }) {
  if (status === "ok") return null;
  const gone = status === "gone";
  return (
    <div role="status" className="fixed inset-x-3 top-3 z-40 mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-[24px] bg-ink p-4 text-paper shadow-xl">
      <div>
        <p className="flex items-center gap-2 font-semibold">
          {!gone && <span className="animate-pulse-dot size-2 rounded-full bg-signal" />}
          {gone ? "Your opponent left the game" : "Your opponent lost connection"}
        </p>
        <p className="text-sm text-paper/60">
          {gone ? "Find a match or open a new room to play again." : "The game carries on if they come back. Or head to the menu."}
        </p>
      </div>
      <PrimaryButton tone="red" onClick={onExit}>
        Main menu
      </PrimaryButton>
    </div>
  );
}

const PING_EVERY = 2000;
const QUIET_AFTER = 7000;

type LinkStatus = "ok" | "quiet" | "gone";

/**
 * "quiet" when pings stop (phone locked, app switched) and clears if they come back;
 * "gone" once the other player leaves or the channel closes.
 */
function useLinkStatus(link: Link): LinkStatus {
  const [status, setStatus] = useState<LinkStatus>("ok");
  useEffect(() => {
    let lastSeen = Date.now();
    let gone = false;
    const drop = () => {
      gone = true;
      setStatus("gone");
    };
    const offMessage = link.onMessage((msg) => {
      lastSeen = Date.now();
      if (msg.t === "bye") drop();
      else if (!gone) setStatus("ok");
    });
    // A dropped websocket shows up as presence leaving; it usually comes back by itself.
    const offPresence = link.onPresence((away) => {
      if (gone) return;
      if (away) setStatus("quiet");
      else {
        lastSeen = Date.now();
        setStatus("ok");
      }
    });
    const timer = setInterval(() => {
      send(link, { t: "ping" });
      if (!gone && Date.now() - lastSeen > QUIET_AFTER) setStatus("quiet");
    }, PING_EVERY);
    const bye = () => send(link, { t: "bye" });

    window.addEventListener("pagehide", bye);
    return () => {
      clearInterval(timer);
      offMessage();
      offPresence();
      window.removeEventListener("pagehide", bye);
    };
  }, [link]);
  return status;
}

/** The host runs the real game and sends the guest only what the guest may see. */
export function HostMatch({
  code,
  link,
  names,
  userIds,
  skins,
  titles,
  onExit,
  onRanked,
  resume,
}: {
  code: string;
  link: Link;
  names: [string, string];
  userIds: [string | null, string | null];
  skins: [string, string];
  titles: [string | null, string | null];
  onExit: () => void;
  onRanked: () => void;
  /** The game this host was running before the page reloaded. */
  resume?: { state: GameState; matchId: string };
}) {
  const [state, dispatch] = useReducer(hostReducer, undefined, () => resume?.state ?? createGame("online", newSeed(), names));
  const [matchId, setMatchId] = useState(() => resume?.matchId ?? newMatchId());
  const status = useLinkStatus(link);
  const restart = useCallback(() => {
    dispatch({ type: "reset", state: createGame("online", newSeed(), names) });
    setMatchId(newMatchId());
  }, [names]);
  const meta = { matchId, userIds, skins, titles };
  const rankNote = useRankNote(state, 0, meta, onRanked);

  useEffect(() => {
    send(link, { t: "meta", matchId, userIds, skins, titles });
  }, [link, matchId, userIds, skins, titles]);

  // Latest values for resending when the guest asks for a sync.
  const latest = useRef({ state, matchId });
  useEffect(() => {
    latest.current = { state, matchId };
  });

  useEffect(() => {
    const resync = () => {
      send(link, { t: "meta", matchId: latest.current.matchId, userIds, skins, titles });
      send(link, { t: "state", state: viewFor(latest.current.state, 1) });
    };
    const offMessage = link.onMessage((msg) => {
      if (msg.t === "action") dispatch({ ...msg.action, player: 1 } as GameAction);
      if (msg.t === "rematch") restart();
      if (msg.t === "sync") resync();
    });
    const offPresence = link.onPresence((away) => {
      if (!away) resync();
    });
    return () => {
      offMessage();
      offPresence();
    };
  }, [link, restart, userIds, skins, titles]);

  useEffect(() => {
    send(link, { t: "state", state: viewFor(state, 1) });
  }, [link, state]);

  // Saved on every move, so a reload reopens the room and carries on.
  useEffect(() => {
    if (state.phase.kind === "gameOver") clearMatch();
    else saveMatch({ kind: "host", code, state, matchId, names, userIds, skins, titles });
  }, [code, state, matchId, names, userIds, skins, titles]);

  // The guest's own timer plays for them; this backs it up if their device stalls.
  const guestWaiting = state.phase.kind === "turn" && !state.players[1].played;
  const guestHand = state.players[1].hand;
  useEffect(() => {
    if (!guestWaiting) return;
    const t = setTimeout(() => {
      const card = guestHand[Math.floor(Math.random() * guestHand.length)];
      if (card) dispatch({ type: "play", player: 1, cardIds: [card.id] });
    }, (TURN_SECONDS + 1 + GUEST_GRACE) * 1000);
    return () => clearTimeout(t);
    // Restart only when a new turn begins, not on every discard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestWaiting, state.round]);

  return (
    <>
      <Game
        view={viewFor(state, 0)}
        me={0}
        act={(a) => dispatch({ ...a, player: 0 } as GameAction)}
        onRestart={restart}
        onExit={onExit}
        rankNote={rankNote}
        skins={skins}
        titles={titles}
        turnSeconds={TURN_SECONDS}
      />
      <LinkBanner status={status} onExit={onExit} />
    </>
  );
}

/** The guest renders whatever the host sends and forwards its own moves. */
export function GuestMatch({ code, link, onExit, onRanked }: { code: string; link: Link; onExit: () => void; onRanked: () => void }) {
  const [view, setView] = useState<GameState | null>(null);
  // The host keeps the game; remembering the room is enough to rejoin after a reload.
  const over = view?.phase.kind === "gameOver";
  useEffect(() => {
    if (over) clearMatch();
    else saveMatch({ kind: "guest", code });
  }, [code, over]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const rankNote = useRankNote(view, 1, meta, onRanked);
  const status = useLinkStatus(link);
  const firstState = useRef(true);

  useEffect(() => {
    const off = link.onMessage((msg) => {
      if (msg.t === "state") {
        if (firstState.current) {
          firstState.current = false;
          play("connect");
        }
        setView(msg.state);
      }
      if (msg.t === "meta")
        setMeta({ matchId: msg.matchId, userIds: msg.userIds, skins: msg.skins ?? ["classic", "classic"], titles: msg.titles ?? [null, null] });
    });
    send(link, { t: "sync" });
    // Ask again if the first answer got lost.
    const retry = setInterval(() => firstState.current && send(link, { t: "sync" }), 2500);
    return () => {
      off();
      clearInterval(retry);
    };
  }, [link]);

  if (!view) {
    return (
      <main className="grid min-h-dvh place-items-center p-6 text-center">
        <p className="flex items-center gap-2 text-sm text-steel">
          <span className="animate-pulse-dot size-2 rounded-full bg-signal" /> Connecting to the room…
        </p>
        <LinkBanner status={status} onExit={onExit} />
      </main>
    );
  }

  return (
    <>
      <Game
        view={view}
        me={1}
        act={(a: LocalAction) => send(link, { t: "action", action: { ...a, player: 1 } as GameAction })}
        onRestart={() => send(link, { t: "rematch" })}
        onExit={onExit}
        rankNote={rankNote}
        skins={meta?.skins ?? ["classic", "classic"]}
        titles={meta?.titles ?? [null, null]}
        turnSeconds={TURN_SECONDS}
      />
      <LinkBanner status={status} onExit={onExit} />
    </>
  );
}
