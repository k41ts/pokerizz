"use client";

import type { BotLevel } from "./bot";
import type { GameState } from "./game";

/** Enough to pick a match back up after the page reloads. */
export type SavedMatch =
  | {
      kind: "bot";
      state: GameState;
      opponent:
        | { kind: "training" }
        | { kind: "ranked"; name: string; skin: string; level: BotLevel; signedIn: boolean };
      /** Server id of a ranked bot match, so the result still counts. */
      botMatchId: string | null;
    }
  | {
      kind: "host";
      code: string;
      state: GameState;
      matchId: string;
      names: [string, string];
      userIds: [string | null, string | null];
      skins: [string, string];
    }
  | { kind: "guest"; code: string };

const KEY = "kartuduel:match";
/** Older than this and the opponent has long gone; start fresh instead. */
const MAX_AGE = 20 * 60 * 1000;

export function saveMatch(match: SavedMatch) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), match }));
  } catch {
    // Storage full or blocked: the match just won't survive a reload.
  }
}

export function loadMatch(): SavedMatch | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const { at, match } = JSON.parse(raw) as { at: number; match: SavedMatch };
    if (Date.now() - at > MAX_AGE) {
      clearMatch();
      return null;
    }
    return match;
  } catch {
    return null;
  }
}

export function clearMatch() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

const PRESENCE_KEY = "kartuduel:presence";

/**
 * A stable id for this browser tab in a room. Rejoining after a reload with the
 * same id means the room still sees one guest, not two.
 */
export function presenceId(): string {
  try {
    let id = window.sessionStorage.getItem(PRESENCE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.sessionStorage.setItem(PRESENCE_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}
