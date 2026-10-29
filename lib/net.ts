"use client";

import type { DataConnection, Peer as PeerType } from "peerjs";
import type { GameAction, GameState } from "./game";

/** Messages between the two browsers. The host runs the game; the guest only sends actions. */
export type NetMessage =
  | { t: "hello"; name: string; userId: string | null }
  /** Sent by the host for every new game: who is signed in, and the id the result is recorded under. */
  | { t: "meta"; matchId: string; userIds: [string | null, string | null] }
  | { t: "state"; state: GameState }
  | { t: "action"; action: GameAction }
  | { t: "rematch" }
  /** Heartbeat: WebRTC can take a long time to notice a closed tab on its own. */
  | { t: "ping" }
  | { t: "bye" };

const PREFIX = "kartuduel-v2-";
// No 0/O/1/I so codes are easy to read out loud.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeRoomCode(): string {
  let code = "";
  for (let i = 0; i < 5; i++) code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return code;
}

export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
}

async function newPeer(id?: string): Promise<PeerType> {
  // PeerJS touches window on import, so load it only in the browser.
  const { Peer } = await import("peerjs");
  return new Promise((resolve, reject) => {
    const peer = id ? new Peer(id) : new Peer();
    peer.once("open", () => resolve(peer));
    peer.once("error", (err) => {
      peer.destroy();
      reject(err);
    });
  });
}

export interface Link {
  peer: PeerType;
  conn: DataConnection;
}

/** Opens a room and waits for one friend to join. */
export async function hostRoom(code: string, onWaiting: () => void): Promise<Link> {
  const peer = await newPeer(PREFIX + code);
  onWaiting();
  return new Promise((resolve) => {
    peer.on("connection", (conn) => {
      conn.once("open", () => resolve({ peer, conn }));
    });
  });
}

export async function joinRoom(code: string): Promise<Link> {
  const peer = await newPeer();
  return new Promise((resolve, reject) => {
    const conn = peer.connect(PREFIX + code, { reliable: true });
    const timer = setTimeout(() => {
      peer.destroy();
      reject(new Error("timeout"));
    }, 12000);
    conn.once("open", () => {
      clearTimeout(timer);
      resolve({ peer, conn });
    });
    peer.once("error", (err) => {
      clearTimeout(timer);
      peer.destroy();
      reject(err);
    });
  });
}

export function send(link: Link, msg: NetMessage) {
  if (link.conn.open) link.conn.send(msg);
}

/** Turns PeerJS error types into a sentence for the lobby. */
export function describeError(err: unknown): string {
  const type = (err as { type?: string })?.type;
  if (type === "unavailable-id") return "Kode room itu lagi dipakai. Coba bikin room lagi.";
  if (type === "peer-unavailable" || (err as Error)?.message === "timeout")
    return "Room ga ketemu. Cek lagi kodenya, dan pastiin temenmu masih di layar room.";
  if (type === "network" || type === "server-error" || type === "socket-error")
    return "Ga bisa nyambung ke server room. Cek koneksi internet, lalu coba lagi.";
  if (type === "browser-incompatible") return "Browser ini ga dukung main online. Coba Chrome atau Firefox terbaru.";
  return "Koneksi gagal. Coba lagi.";
}
