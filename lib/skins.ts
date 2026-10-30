import { createContext, useContext } from "react";

export type SkinId = "classic" | "blueprint" | "sakura" | "neon" | "gold" | "void";
export type BackPattern = "stripes" | "grid" | "petals" | "circuit" | "diamonds" | "stars";

export interface Skin {
  id: SkinId;
  name: string;
  /** Mirrors public.skin_prices; the server is the source of truth when buying. */
  price: number;
  description: string;
  /** Card face background. */
  paper: string;
  /** Lines, black suits and text. */
  ink: string;
  /** Red suits and accents. */
  red: string;
  /** Panel behind face-card portraits. */
  panel: string;
  /** Fill of portrait heads. */
  figure: string;
  /** Table behind the cards on your screen, picked to contrast with the card faces. */
  board: string;
  /** Opacity of the card outline; dark faces need a stronger edge. */
  edge: number;
  back: { base: string; a: string; b: string; line: string; pattern: BackPattern };
}

export const SKINS: Record<SkinId, Skin> = {
  classic: {
    id: "classic",
    name: "Classic",
    price: 0,
    description: "Clean white with red accents.",
    paper: "#ffffff",
    ink: "#000000",
    red: "#ff2a1f",
    panel: "#e8e8e6",
    figure: "#ffffff",
    board: "#000000",
    edge: 0.15,
    back: { base: "#000000", a: "#000000", b: "#ff2a1f", line: "#ffffff", pattern: "stripes" },
  },
  blueprint: {
    id: "blueprint",
    name: "Blueprint",
    price: 100,
    description: "Blue technical drawings, white lines.",
    paper: "#1d4ed8",
    ink: "#ffffff",
    red: "#fde047",
    panel: "#1e40af",
    figure: "#2563eb",
    board: "#0b1b3f",
    edge: 0.35,
    back: { base: "#1e3a8a", a: "#1e3a8a", b: "#3b82f6", line: "#ffffff", pattern: "grid" },
  },
  sakura: {
    id: "sakura",
    name: "Sakura",
    price: 200,
    description: "Soft pink and falling petals.",
    paper: "#fff5f7",
    ink: "#3f1d2b",
    red: "#e11d74",
    panel: "#fbd5e2",
    figure: "#fff5f7",
    board: "#3b0a24",
    edge: 0.15,
    back: { base: "#831843", a: "#9d174d", b: "#f9a8d4", line: "#fff5f7", pattern: "petals" },
  },
  neon: {
    id: "neon",
    name: "Neon",
    price: 300,
    description: "Dark cards with glowing symbols.",
    paper: "#0b0b14",
    ink: "#22d3ee",
    red: "#f472b6",
    panel: "#16162a",
    figure: "#0b0b14",
    board: "#231a52",
    edge: 0.45,
    back: { base: "#05050c", a: "#05050c", b: "#22d3ee", line: "#f472b6", pattern: "circuit" },
  },
  gold: {
    id: "gold",
    name: "Gold",
    price: 450,
    description: "Rich cream with gold trim.",
    paper: "#fbf3e1",
    ink: "#2a2112",
    red: "#b8860b",
    panel: "#efdcb0",
    figure: "#fbf3e1",
    board: "#2b2112",
    edge: 0.2,
    back: { base: "#1a1408", a: "#1a1408", b: "#d4a537", line: "#f5d77a", pattern: "diamonds" },
  },
  void: {
    id: "void",
    name: "Void",
    price: 600,
    description: "Pitch black, scattered with stars.",
    paper: "#050505",
    ink: "#f5f5f5",
    red: "#ff2a1f",
    panel: "#141414",
    figure: "#050505",
    board: "#5a0f12",
    edge: 0.45,
    back: { base: "#000000", a: "#000000", b: "#ffffff", line: "#ff2a1f", pattern: "stars" },
  },
};

export const SKIN_IDS = Object.keys(SKINS) as SkinId[];

export function skinById(id: string | null | undefined): Skin {
  return SKINS[id as SkinId] ?? SKINS.classic;
}

/** The skin cards inside this provider are drawn with. Each player's cards use their own. */
export const SkinContext = createContext<Skin>(SKINS.classic);

export function useSkin() {
  return useContext(SkinContext);
}
