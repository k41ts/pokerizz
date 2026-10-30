/** Achievement titles a player can earn and show off during matches. */
export type TitleId = "top_1" | "king_full_house" | "untouchable";

export const FULL_HOUSE_GOAL = 25;

export const TITLES: Record<TitleId, { label: string; how: string }> = {
  top_1: { label: "TOP 1 LEADERBOARD", how: "Reach #1 on the leaderboard." },
  king_full_house: { label: "THE KING OF FULL HOUSE", how: `Play ${FULL_HOUSE_GOAL} Full Houses in ranked or friend matches.` },
  untouchable: { label: "UNTOUCHABLE", how: "Win a ranked or friend match without losing a single HP." },
};

export const TITLE_IDS = Object.keys(TITLES) as TitleId[];

export function isTitle(id: string | null | undefined): id is TitleId {
  return !!id && id in TITLES;
}
