"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { chooseBestPlay, chooseDiscard, chooseJoker } from "@/lib/bot";
import { reportLoss } from "@/lib/account";
import { createGame, gameReducer, viewFor, type GameAction, type GameState, type PlayerIndex } from "@/lib/game";
import { send, type Link } from "@/lib/net";
import { play } from "@/lib/sound";
import Game, { type LocalAction, type RankNote } from "./Game";
import { PrimaryButton } from "./ui";

const BOT_DELAY = 900;

function newSeed() {
  return Math.floor(Math.random() * 2 ** 32);
}

type Reset = { type: "reset"; state: GameState };
function hostReducer(state: GameState, action: GameAction | Reset): GameState {
  return action.type === "reset" ? action.state : gameReducer(state, action);
}

/** Single player: the bot is player 2 and acts on its own timer. */
export function BotMatch({ name, onExit }: { name: string; onExit: () => void }) {
  const [state, dispatch] = useReducer(hostReducer, undefined, () => createGame("bot", newSeed(), [name, "Bot"]));
  const { phase, players } = state;
  const bot = players[1];

  useEffect(() => {
    let act: (() => void) | null = null;
    if (phase.kind === "turn" && !bot.played) {
      act = () => {
        const toss = chooseDiscard(bot.hand, bot.jokers, bot.discardsLeft);
        if (toss) dispatch({ type: "discard", player: 1, cardIds: toss.map((c) => c.id) });
        else dispatch({ type: "play", player: 1, cardIds: chooseBestPlay(bot.hand, bot.jokers).cards.map((c) => c.id) });
      };
    } else if (phase.kind === "reveal" && !phase.ready[1]) {
      dispatch({ type: "continue", player: 1 });
    } else if (phase.kind === "jokerPick" && !phase.done[1]) {
      act = () => dispatch({ type: "pickJoker", player: 1, ...chooseJoker(phase.offers[1], bot.jokers, bot.history) });
    }
    if (!act) return;
    const t = setTimeout(act, BOT_DELAY);
    return () => clearTimeout(t);
  }, [phase, bot]);

  return (
    <Game
      view={viewFor(state, 0)}
      me={0}
      act={(a) => dispatch({ ...a, player: 0 } as GameAction)}
      onRestart={() => dispatch({ type: "reset", state: createGame("bot", newSeed(), [name, "Bot"]) })}
      onExit={onExit}
    />
  );
}

interface Meta {
  matchId: string;
  userIds: [string | null, string | null];
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
    if (winner === null) return;
    if (winner !== me) {
      void reportLoss(meta.matchId, meta.userIds[winner]!).then(onRanked);
    } else {
      // The other device reports; give it a moment before reloading our stars.
      const t = setTimeout(onRanked, 2500);
      return () => clearTimeout(t);
    }
  }, [winner, meta, ranked, me, onRanked]);

  if (winner === undefined) return null;
  if (!ranked) return { kind: "unranked", text: "Main pakai akun berdua biar menang dapat bintang." };
  if (winner === null) return { kind: "unranked", text: "Seri, ga ada bintang." };
  return winner === me ? { kind: "star", text: "+1 bintang buat rank-mu" } : { kind: "loss", text: "Kekalahan dicatat di akunmu." };
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
          {gone ? "Temanmu keluar dari game" : "Temanmu lagi ga nyambung"}
        </p>
        <p className="text-sm text-paper/60">
          {gone ? "Bikin room baru buat main lagi." : "Game lanjut otomatis kalau dia balik. Atau keluar ke menu."}
        </p>
      </div>
      <PrimaryButton tone="red" onClick={onExit}>
        Ke menu
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
  link,
  names,
  userIds,
  onExit,
  onRanked,
}: {
  link: Link;
  names: [string, string];
  userIds: [string | null, string | null];
  onExit: () => void;
  onRanked: () => void;
}) {
  const [state, dispatch] = useReducer(hostReducer, undefined, () => createGame("online", newSeed(), names));
  const [matchId, setMatchId] = useState(newMatchId);
  const status = useLinkStatus(link);
  const restart = useCallback(() => {
    dispatch({ type: "reset", state: createGame("online", newSeed(), names) });
    setMatchId(newMatchId());
  }, [names]);
  const meta = { matchId, userIds };
  const rankNote = useRankNote(state, 0, meta, onRanked);

  useEffect(() => {
    send(link, { t: "meta", matchId, userIds });
  }, [link, matchId, userIds]);

  // Latest values for resending when the guest asks for a sync.
  const latest = useRef({ state, matchId });
  useEffect(() => {
    latest.current = { state, matchId };
  });

  useEffect(() => {
    const resync = () => {
      send(link, { t: "meta", matchId: latest.current.matchId, userIds });
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
  }, [link, restart, userIds]);

  useEffect(() => {
    send(link, { t: "state", state: viewFor(state, 1) });
  }, [link, state]);

  return (
    <>
      <Game
        view={viewFor(state, 0)}
        me={0}
        act={(a) => dispatch({ ...a, player: 0 } as GameAction)}
        onRestart={restart}
        onExit={onExit}
        rankNote={rankNote}
      />
      <LinkBanner status={status} onExit={onExit} />
    </>
  );
}

/** The guest renders whatever the host sends and forwards its own moves. */
export function GuestMatch({ link, onExit, onRanked }: { link: Link; onExit: () => void; onRanked: () => void }) {
  const [view, setView] = useState<GameState | null>(null);
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
      if (msg.t === "meta") setMeta({ matchId: msg.matchId, userIds: msg.userIds });
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
          <span className="animate-pulse-dot size-2 rounded-full bg-signal" /> Nyambung ke room…
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
      />
      <LinkBanner status={status} onExit={onExit} />
    </>
  );
}
