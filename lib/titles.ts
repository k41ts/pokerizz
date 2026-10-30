import type { Profile } from "./account";

/** Achievement titles a player can show off during matches. */
export type TitleId = "leaderboard" | "king_full_house" | "untouchable";

export const FULL_HOUSE_GOAL = 25;
/** The leaderboard title shows for players currently in this many top spots. */
export const LEADERBOARD_TOP = 3;

export const TITLES: Record<TitleId, { label: string; how: string }> = {
  leaderboard: { label: "TOP LEADERBOARD", how: `Be in the top ${LEADERBOARD_TOP} of the leaderboard. It follows your current spot.` },
  king_full_house: { label: "THE KING OF FULL HOUSE", how: `Play ${FULL_HOUSE_GOAL} Full Houses in ranked or friend matches.` },
  untouchable: { label: "UNTOUCHABLE", how: "Win a ranked or friend match without losing a single HP." },
};

export const TITLE_IDS = Object.keys(TITLES) as TitleId[];

/**
 * What a player shows under their name: "top:N" for a live leaderboard spot, or a
 * title id. Players in the top spots show it automatically until they pick another title.
 */
export function shownTitle(title: string | null | undefined, position: number | null | undefined): string | null {
  const top = position && position <= LEADERBOARD_TOP ? `top:${position}` : null;
  if (!title || title === "leaderboard") return top;
  return title in TITLES ? title : null;
}

export function titleFor(profile: Pick<Profile, "title" | "position"> | null): string | null {
  return profile ? shownTitle(profile.title, profile.position) : null;
}
