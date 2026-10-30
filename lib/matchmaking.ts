"use client";

import { supabase, tierIndex } from "./account";
import type { BotLevel } from "./bot";
import { hostConnected, hostRoom, joinRoom, makeRoomCode, send, type Connected, type Link } from "./net";
import { SKIN_IDS, type SkinId } from "./skins";

export interface Seeker {
  name: string;
  userId: string | null;
  stars: number;
  skin: string;
  title: string | null;
}

export type MatchFound =
  | { kind: "human"; connected: Connected }
  | { kind: "bot"; name: string; skin: SkinId; level: BotLevel };

interface QueueEntry {
  key: string;
  userId: string | null;
  since: number;
}

type QueueMessage = { t: "match"; host: string; guest: string; code: string };

/** How long to look for a real player before a bot takes the seat, in ms. */
const MIN_WAIT = 8000;
const MAX_WAIT = 12000;
const HELLO_TIMEOUT = 15000;

const FIRST = ["raka", "dimas", "nadia", "putri", "bayu", "fajar", "sinta", "aldi", "rizky", "tasya", "yoga", "intan", "kevin", "dewi", "arif", "salsa", "bima", "citra", "gilang", "laras"];
const LAST = ["88", "17", "_id", "gg", "x", "99", "ace", "jkt", "_", "07", "pro", "21", "zz", "_kd", "45"];

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** A username that looks like any other player's. */
export function randomPlayerName(): string {
  const base = pick(FIRST) + (Math.random() < 0.5 ? "_" : "");
  return (base + pick(LAST)).replace(/__+/g, "_").slice(0, 16);
}

function randomSkin(): SkinId {
  return Math.random() < 0.5 ? "classic" : pick(SKIN_IDS);
}

/** Bot strength follows the player's rank; guests meet the weakest. */
export function botLevelFor(stars: number | null): BotLevel {
  return (stars === null ? 0 : Math.min(4, tierIndex(stars))) as BotLevel;
}

/**
 * Waits in the shared queue for another player. The longest-waiting player hosts a
 * room with the next one. If nobody shows up in time, a bot takes the seat.
 */
export function findMatch(me: Seeker, onSeconds: (s: number) => void, signal: AbortSignal): Promise<MatchFound> {
  const sb = supabase();
  const bot = (): MatchFound => ({ kind: "bot", name: randomPlayerName(), skin: randomSkin(), level: botLevelFor(me.userId ? me.stars : null) });
  if (!sb) return Promise.resolve(bot());

  const key = crypto.randomUUID();
  const since = Date.now();
  const waitFor = MIN_WAIT + Math.random() * (MAX_WAIT - MIN_WAIT);
  const channel = sb.channel("kartuduel-queue", { config: { broadcast: { self: false }, presence: { key } } });

  return new Promise<MatchFound>((resolve, reject) => {
    let settled = false;
    let paired = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const leave = () => {
      timers.forEach(clearTimeout);
      void channel.untrack().finally(() => sb.removeChannel(channel));
    };
    const finish = (result: MatchFound) => {
      if (settled) return;
      settled = true;
      leave();
      resolve(result);
    };
    const fail = (err: unknown) => {
      if (settled) return;
      settled = true;
      leave();
      reject(err);
    };
    signal.addEventListener("abort", () => fail(new DOMException("cancelled", "AbortError")));

    const meAsSeeker = { name: me.name, userId: me.userId, skin: me.skin, title: me.title };

    async function becomeHost(guestKey: string) {
      paired = true;
      const code = makeRoomCode();
      let room: Link | null = null;
      try {
        const hosting = hostRoom(code, (open) => {
          room = open;
          void channel.send({ type: "broadcast", event: "queue", payload: { t: "match", host: key, guest: guestKey, code } satisfies QueueMessage });
        });
        const timeout = new Promise<never>((_, rej) => timers.push(setTimeout(() => rej(new Error("no hello")), HELLO_TIMEOUT)));
        const { link, hello } = await Promise.race([hosting, timeout]);
        finish({ kind: "human", connected: hostConnected(code, link, meAsSeeker, hello) });
      } catch {
        (room as Link | null)?.close();
        finish(bot());
      }
    }

    async function becomeGuest(code: string) {
      paired = true;
      try {
        const link = await joinRoom(code);
        send(link, { t: "hello", ...meAsSeeker });
        finish({ kind: "human", connected: { role: "guest", code, link } });
      } catch {
        finish(bot());
      }
    }

    channel.on("broadcast", { event: "queue" }, ({ payload }) => {
      const msg = payload as QueueMessage;
      if (msg.t === "match" && msg.guest === key && !paired && !settled) void becomeGuest(msg.code);
    });

    channel.on("presence", { event: "sync" }, () => {
      if (paired || settled) return;
      const waiting = Object.values(channel.presenceState<QueueEntry>())
        .flat()
        // Two tabs of the same account shouldn't play each other.
        .filter((e) => e.key === key || !e.userId || e.userId !== me.userId)
        .sort((a, b) => a.since - b.since || a.key.localeCompare(b.key));
      // Only the longest-waiting player starts a pairing, so two players never claim the same partner.
      if (waiting.length >= 2 && waiting[0].key === key) void becomeHost(waiting[1].key);
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") void channel.track({ key, userId: me.userId, since } satisfies QueueEntry);
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") finish(bot());
    });

    const tick = setInterval(() => {
      if (settled) return clearInterval(tick);
      onSeconds(Math.floor((Date.now() - since) / 1000));
    }, 250);
    timers.push(tick as unknown as ReturnType<typeof setTimeout>);
    timers.push(
      setTimeout(() => {
        if (!paired) finish(bot());
      }, waitFor),
    );
  });
}
