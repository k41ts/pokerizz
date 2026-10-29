"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./account";
import type { GameAction, GameState } from "./game";

/** Messages between the two browsers. The host runs the game; the guest only sends actions. */
export type NetMessage =
  | { t: "hello"; name: string; userId: string | null; skin: string }
  /** Sent by the host for every new game: who is signed in, and the id the result is recorded under. */
  | { t: "meta"; matchId: string; userIds: [string | null, string | null]; skins: [string, string] }
  | { t: "state"; state: GameState }
  | { t: "action"; action: GameAction }
  | { t: "rematch" }
  /** Guest asks the host to resend meta and state (after joining or reconnecting). */
  | { t: "sync" }
  /** Heartbeat, so a player whose phone went to sleep shows up as "not connected". */
  | { t: "ping" }
  | { t: "bye" }
  /** Guest looking for the host; the host answers "here". Works even before presence syncs. */
  | { t: "knock" }
  | { t: "here" };

type Role = "host" | "guest";

// No 0/O/1/I so codes are easy to read out loud.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const JOIN_TIMEOUT = 10000;
/** How long a guest keeps knocking before saying the room doesn't exist. */
const HOST_WAIT = 30000;
const KNOCK_EVERY = 1200;

export function makeRoomCode(): string {
  let code = "";
  for (let i = 0; i < 5; i++) code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return code;
}

export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
}

/**
 * A room is a Supabase Realtime channel. Messages go through Supabase's servers over a
 * websocket, so it works on any network (mobile data, strict Wi-Fi), unlike direct WebRTC.
 */
export interface Link {
  send(msg: NetMessage): void;
  onMessage(fn: (msg: NetMessage) => void): () => void;
  /** The other player's connection dropped (true) or came back (false). */
  onPresence(fn: (gone: boolean) => void): () => void;
  close(): void;
}

/** A room both players are in, from the lobby or from matchmaking. */
export type Connected =
  | { role: "host"; link: Link; names: [string, string]; userIds: [string | null, string | null]; skins: [string, string] }
  | { role: "guest"; link: Link };

/** The host side of a room once the guest has said hello. */
export function hostConnected(link: Link, me: { name: string; userId: string | null; skin: string }, hello: Extract<NetMessage, { t: "hello" }>): Connected {
  return {
    role: "host",
    link,
    names: [me.name, hello.name || "Teman"],
    userIds: [me.userId, hello.userId],
    skins: [me.skin, hello.skin || "classic"],
  };
}

export class RoomError extends Error {
  constructor(public kind: "no-server" | "network" | "not-found" | "full") {
    super(kind);
  }
}

interface Presence {
  role: Role;
}

function others(channel: RealtimeChannel, role: Role): Presence[] {
  return Object.values(channel.presenceState<Presence>())
    .flat()
    .filter((p) => p.role !== role);
}

async function openChannel(code: string, role: Role): Promise<{ channel: RealtimeChannel; link: Link }> {
  const sb = supabase();
  if (!sb) throw new RoomError("no-server");

  const channel = sb.channel(`kartuduel-room-${code}`, {
    config: { broadcast: { self: false, ack: false }, presence: { key: `${role}-${crypto.randomUUID()}` } },
  });
  const messageFns = new Set<(msg: NetMessage) => void>();
  const presenceFns = new Set<(gone: boolean) => void>();
  let closed = false;

  channel.on("broadcast", { event: "msg" }, ({ payload }) => {
    const { from, msg } = payload as { from: Role; msg: NetMessage };
    if (from !== role) messageFns.forEach((fn) => fn(msg));
  });
  channel.on("presence", { event: "join" }, ({ newPresences }) => {
    if ((newPresences as unknown as Presence[]).some((p) => p.role !== role)) presenceFns.forEach((fn) => fn(false));
  });
  channel.on("presence", { event: "leave" }, ({ leftPresences }) => {
    if ((leftPresences as unknown as Presence[]).some((p) => p.role !== role)) presenceFns.forEach((fn) => fn(true));
  });

  const link: Link = {
    send(msg) {
      if (!closed) void channel.send({ type: "broadcast", event: "msg", payload: { from: role, msg } });
    },
    onMessage(fn) {
      messageFns.add(fn);
      return () => messageFns.delete(fn);
    },
    onPresence(fn) {
      presenceFns.add(fn);
      return () => presenceFns.delete(fn);
    },
    close() {
      if (closed) return;
      closed = true;
      void channel.untrack().finally(() => sb.removeChannel(channel));
    },
  };

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new RoomError("network")), JOIN_TIMEOUT);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timer);
        resolve();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timer);
        reject(new RoomError("network"));
      }
    });
  }).catch((err) => {
    link.close();
    throw err;
  });
  await channel.track({ role } satisfies Presence);

  // Coming back from another app: announce ourselves again in case the socket dropped meanwhile.
  const onVisible = () => {
    if (document.visibilityState === "visible" && !closed) void channel.track({ role } satisfies Presence);
  };
  document.addEventListener("visibilitychange", onVisible);
  const close = link.close;
  link.close = () => {
    document.removeEventListener("visibilitychange", onVisible);
    close();
  };
  return { channel, link };
}

/** Opens a room and waits for a friend to say hello. */
export async function hostRoom(code: string, onWaiting: (link: Link) => void): Promise<{ link: Link; hello: Extract<NetMessage, { t: "hello" }> }> {
  const { link } = await openChannel(code, "host");
  // Answer knocks for the whole life of the room, so a guest can always find us.
  link.onMessage((msg) => {
    if (msg.t === "knock") link.send({ t: "here" });
  });
  onWaiting(link);
  return new Promise((resolve) => {
    const off = link.onMessage((msg) => {
      if (msg.t !== "hello") return;
      off();
      resolve({ link, hello: msg });
    });
  });
}

/** Joins a room once the host answers a knock or shows up in presence. */
export async function joinRoom(code: string, onSearching?: (seconds: number) => void): Promise<Link> {
  const { channel, link } = await openChannel(code, "guest");
  let answered = false;
  const off = link.onMessage((msg) => {
    if (msg.t === "here") answered = true;
  });
  const started = Date.now();
  let lastKnock = 0;
  try {
    while (Date.now() - started < HOST_WAIT) {
      const everyone = Object.values(channel.presenceState<Presence>()).flat();
      const hostSeen = answered || others(channel, "guest").some((p) => p.role === "host");
      if (hostSeen) {
        // Counting ourselves, more than one guest means someone else got here first.
        if (everyone.filter((p) => p.role === "guest").length > 1) throw new RoomError("full");
        return link;
      }
      if (Date.now() - lastKnock > KNOCK_EVERY) {
        lastKnock = Date.now();
        link.send({ t: "knock" });
      }
      onSearching?.(Math.floor((Date.now() - started) / 1000));
      await new Promise((r) => setTimeout(r, 250));
    }
    throw new RoomError("not-found");
  } catch (err) {
    link.close();
    throw err;
  } finally {
    off();
  }
}

export function send(link: Link, msg: NetMessage) {
  link.send(msg);
}

export function describeError(err: unknown): string {
  const kind = err instanceof RoomError ? err.kind : null;
  if (kind === "not-found") return "Room ga ketemu. Cek lagi kodenya, dan minta temenmu buka layar room di HP-nya (jangan ditutup atau pindah aplikasi).";
  if (kind === "full") return "Room itu udah ada dua pemain. Minta kode room baru.";
  if (kind === "no-server") return "Main online belum tersedia di server ini.";
  return "Ga bisa nyambung ke server room. Cek koneksi internet, lalu coba lagi.";
}
