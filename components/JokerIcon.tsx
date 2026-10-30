import { useId } from "react";
import type { JokerId } from "@/lib/jokers";

/** Each joker's accent: the glow behind the jester and the color of what it holds. */
const ACCENT: Record<JokerId, string> = {
  pasangan_setia: "#e0457b",
  pencinta_warna: "#8a5cff",
  jalan_lurus: "#19b3ad",
  si_nekat: "#f08a24",
  raja_hati: "#e3263d",
  tameng: "#3f78e6",
  vampir: "#b0102c",
  tangan_ekstra: "#2fae60",
  pengganda: "#e0b02c",
};

const INK = "#141013";
const IVORY = "#f3ead6";
const BONE = "#f4efe4";
const CRIMSON = "#a3121f";
const WINE = "#2a070b";
const GOLD = "#d9a93a";
const GOLD_DARK = "#8a6418";

function Glove({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={4.2} fill={BONE} stroke={INK} strokeWidth={1.1} />
      <path d={`M${x - 2.4} ${y - 1.2} h4.8 M${x - 2.4} ${y + 1} h4.8`} stroke={INK} strokeWidth={0.5} opacity={0.5} />
    </g>
  );
}

/** A coat sleeve from the shoulder to the hand. */
function Sleeve({ from, to }: { from: [number, number]; to: [number, number] }) {
  const d = `M${from[0]} ${from[1]} Q${(from[0] + to[0]) / 2 + (to[0] < 50 ? -7 : 7)} ${(from[1] + to[1]) / 2 + 5} ${to[0]} ${to[1]}`;
  return (
    <>
      <path d={d} fill="none" stroke={INK} strokeWidth={8.4} strokeLinecap="round" />
      <path d={d} fill="none" stroke="#2a1218" strokeWidth={6} strokeLinecap="round" />
      <path d={d} fill="none" stroke={GOLD} strokeWidth={0.8} strokeDasharray="1.6 2.2" opacity={0.7} />
    </>
  );
}

/** A small ornate playing card held by the jester. */
function HeldCard({ x, y, rot = 0, rank, suit, w = 14, h = 19 }: { x: number; y: number; rot?: number; rank: string; suit: string; w?: number; h?: number }) {
  const red = suit === "♥" || suit === "♦";
  return (
    <g transform={`rotate(${rot} ${x} ${y + h / 2})`}>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={1.6} fill={IVORY} stroke={INK} strokeWidth={0.9} />
      <rect x={x - w / 2 + 1.2} y={y - h / 2 + 1.2} width={w - 2.4} height={h - 2.4} rx={1} fill="none" stroke={GOLD_DARK} strokeWidth={0.45} />
      <text x={x - w / 2 + 2.2} y={y - h / 2 + 6.4} fontSize={5.6} fontWeight={700} fill={red ? CRIMSON : INK} fontFamily="Georgia, serif">
        {rank}
      </text>
      <text x={x} y={y + 4.2} fontSize={8} textAnchor="middle" fill={red ? CRIMSON : INK}>
        {suit}
      </text>
    </g>
  );
}

function Fan({ cards }: { cards: [string, string][] }) {
  const mid = (cards.length - 1) / 2;
  return (
    <>
      {cards.map(([rank, suit], i) => (
        <g key={i} transform={`rotate(${(i - mid) * 13} 50 124)`}>
          <HeldCard x={50} y={101} rank={rank} suit={suit} />
        </g>
      ))}
    </>
  );
}

/** The jester: two-tone hat with gold bells, pale grinning face, gold-trimmed dark coat. */
// Mouth: upper lip from corner to corner, lower lip back.
const MOUTH = "M37.6 61 Q40.5 63 42 65 Q50 72.4 58 65 Q59.5 63 62.4 61 Q60.5 66.8 57.6 69.6 Q50 76 42.4 69.6 Q39.5 66.8 37.6 61 Z";

/** Points along a quadratic curve, for a row of teeth that follows the lip. */
function teethRow(p0: [number, number], c: [number, number], p1: [number, number], n: number, depth: number): string {
  const at = (t: number) => [
    (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t ** 2 * p1[0],
    (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t ** 2 * p1[1],
  ];
  const pts: string[] = [];
  for (let i = 0; i <= n * 2; i++) {
    const [x, y] = at(i / (n * 2));
    pts.push(`${x.toFixed(2)} ${(i % 2 ? y + depth : y).toFixed(2)}`);
  }
  return `M${pts.join(" L")} Z`;
}

const UPPER_TEETH = teethRow([40.6, 63.6], [50, 73.4], [59.4, 63.6], 9, 2.4);
const LOWER_TEETH = teethRow([42.4, 69], [50, 75.4], [57.6, 69], 7, -1.9);

function Jester({ vampire, ids }: { vampire: boolean; ids: { gold: string; skin: string; eyeGlow: string } }) {
  const eye = vampire ? "#ff2338" : "#ffd23a";
  return (
    <>
      {/* Coat with a high collar and gold trim. */}
      <path d="M26 132 L30 94 Q34 84 44 82 L56 82 Q66 84 70 94 L74 132 Z" fill="#241016" stroke={INK} strokeWidth={1.1} />
      <path d="M50 84 L50 132" stroke={GOLD} strokeWidth={0.9} opacity={0.8} />
      <path d="M30 94 Q34 84 44 82 L46 92 Q38 92 30 94 Z M70 94 Q66 84 56 82 L54 92 Q62 92 70 94 Z" fill={CRIMSON} stroke={INK} strokeWidth={0.9} />
      <path d="M30 94 Q38 92 46 92 M70 94 Q62 92 54 92" stroke={GOLD} strokeWidth={1} fill="none" />
      {vampire && <path d="M28 96 L19 66 L41 80 Z M72 96 L81 66 L59 80 Z" fill={INK} stroke={CRIMSON} strokeWidth={0.8} />}
      {/* Pointed ruff, alternating crimson and black. */}
      <path d="M36 76 L40 85 L44 77.5 Z M44 77.5 L48 86 L50 78 Z M56 77.5 L52 86 L50 78 Z M64 76 L60 85 L56 77.5 Z" fill={CRIMSON} stroke={INK} strokeWidth={0.8} strokeLinejoin="round" />
      <path d="M40 85 L44 77.5 L48 86 Z M60 85 L56 77.5 L52 86 Z" fill={INK} />
      <path d="M35 76 Q50 81 65 76" stroke={GOLD} strokeWidth={1} fill="none" />

      {/* Head and hat drawn larger than life, so the face dominates the card. */}
      <g transform="translate(0 3) translate(50 40) scale(1.2) translate(-50 -40)">
      {/* Hat: black on the left, crimson on the right, bells hanging low. */}
      <path d="M36 50 C28 42 21 36 15 40 C14 45 17 50 19 54 C22 46 29 45 38 53 Z" fill={INK} stroke="#000" strokeWidth={0.8} />
      <path d="M64 50 C72 42 79 36 85 40 C86 45 83 50 81 54 C78 46 71 45 62 53 Z" fill={CRIMSON} stroke={INK} strokeWidth={0.8} />
      <path d="M38 46 C36 34 40 24 48 19 C49 28 49 36 50 44 Z" fill={INK} />
      <path d="M62 46 C64 34 60 24 52 19 C51 28 51 36 50 44 Z" fill={CRIMSON} stroke={INK} strokeWidth={0.6} />
      <path d="M34 51 Q50 41 66 51 L65 55 Q50 46 35 55 Z" fill={GOLD} stroke={GOLD_DARK} strokeWidth={0.6} />
      {[
        [19, 55],
        [81, 55],
        [48.5, 19],
      ].map(([cx, cy]) => (
        <g key={`${cx}`}>
          <circle cx={cx} cy={cy} r={3.4} fill={`url(#${ids.gold})`} stroke={GOLD_DARK} strokeWidth={0.6} />
          <path d={`M${cx - 1.6} ${cy + 1.2} h3.2`} stroke={GOLD_DARK} strokeWidth={0.6} />
        </g>
      ))}

      {/* Face: gaunt and shadowed, hollow eyes that glow, a grin cut up to the ears. */}
      <path d="M38.2 57 L31 50.5 L38.8 63.5 Z M61.8 57 L69 50.5 L61.2 63.5 Z" fill={`url(#${ids.skin})`} stroke={INK} strokeWidth={0.7} />
      <path d="M38 55 Q37 47.5 50 47.5 Q63 47.5 62 55 Q62.5 65 57.5 72.5 Q50 78.5 42.5 72.5 Q37.5 65 38 55 Z" fill={`url(#${ids.skin})`} stroke={INK} strokeWidth={1} />
      <path d="M40 61.5 Q42.5 65.5 44.8 64 M60 61.5 Q57.5 65.5 55.2 64" stroke="#5e554a" strokeWidth={0.7} fill="none" opacity={0.6} />
      {/* Cracks in the paint. */}
      <path d="M53.5 48.2 L54.8 50.8 L53.6 52.4 L55.4 54.6 M39.2 62 L40.8 63.6 L40 65.4" stroke="#3a332c" strokeWidth={0.45} fill="none" />
      {/* Hollow sockets with runny black paint. */}
      <path d="M39.6 55.2 Q43.6 51.6 47.8 54.4 Q47.8 59.8 43.6 60.4 Q40.2 59.4 39.6 55.2 Z M60.4 55.2 Q56.4 51.6 52.2 54.4 Q52.2 59.8 56.4 60.4 Q59.8 59.4 60.4 55.2 Z" fill="#070405" />
      <path d="M42.2 60 Q42.6 63 41.9 66 M57.8 60 Q57.4 63 58.1 66.4" stroke="#070405" strokeWidth={1.1} strokeLinecap="round" opacity={0.75} />
      <path d="M38.8 53 L48.2 55.4 M61.2 53 L51.8 55.4" stroke={INK} strokeWidth={1.7} strokeLinecap="round" />
      <g filter={`url(#${ids.eyeGlow})`}>
        <circle cx={44.2} cy={57} r={1.35} fill={eye} />
        <circle cx={55.8} cy={57} r={1.35} fill={eye} />
      </g>
      <path d="M44.2 55.9 V58.1 M55.8 55.9 V58.1" stroke="#000" strokeWidth={0.45} />
      <path d="M49.1 60.4 l.6 1.7 M50.9 60.4 l-.6 1.7" stroke={INK} strokeWidth={0.6} strokeLinecap="round" />
      {/* The grin: a dark mouth from cheek to cheek, cut further toward the ears. */}
      <path d="M37.6 61 L35 56.8 M62.4 61 L65 56.8" stroke={CRIMSON} strokeWidth={1.1} strokeLinecap="round" />
      <path d="M35.6 58.2 l1.4 -.8 M36.6 59.8 l1.4 -.8 M64.4 58.2 l-1.4 -.8 M63.4 59.8 l-1.4 -.8" stroke={INK} strokeWidth={0.45} />
      <path d={MOUTH} fill="#120608" stroke={CRIMSON} strokeWidth={1} strokeLinejoin="round" />
      <path d={UPPER_TEETH} fill="#efe8d6" stroke={INK} strokeWidth={0.3} strokeLinejoin="round" />
      <path d={LOWER_TEETH} fill="#e6dcc4" stroke={INK} strokeWidth={0.3} strokeLinejoin="round" />
      {vampire && <path d="M44.6 66.6 l.9 4 l1 -3.6 M53.5 67 l1 3.6 l.9 -4" fill="#fff" stroke={INK} strokeWidth={0.4} />}
      {/* Blood running from the corners of the mouth. */}
      <path d="M41.6 69.4 Q42.4 72 42 75.2 A1 1 0 1 0 44 75.2 Q43.6 72.4 43.4 70.6 Z M57.4 69.8 Q56.8 71.6 57.2 73.4 A0.9 0.9 0 1 0 58.9 73.4 Q58.8 71.6 58.6 69.4 Z" fill="#9c0b18" />
      </g>
    </>
  );
}

const SHOULDERS: [[number, number], [number, number]] = [
  [34, 95],
  [66, 95],
];

/** Sleeves, gloves and whatever this joker holds, in front of the jester. */
function Props({ id, accent }: { id: JokerId; accent: string }) {
  const sleeves = (l: [number, number], r: [number, number]) => (
    <>
      <Sleeve from={SHOULDERS[0]} to={l} />
      <Sleeve from={SHOULDERS[1]} to={r} />
    </>
  );
  switch (id) {
    case "tameng":
      return (
        <>
          {sleeves([34, 106], [66, 106])}
          <path d="M50 89 L65 94 V105 Q65 117 50 125 Q35 117 35 105 V94 Z" fill={accent} stroke={INK} strokeWidth={1.3} />
          <path d="M50 92.5 L61.5 96.5 V105 Q61.5 114.5 50 121 Q38.5 114.5 38.5 105 V96.5 Z" fill="none" stroke={GOLD} strokeWidth={1} />
          <path d="M50 99 L53 105 L50 111 L47 105 Z" fill={GOLD} />
          <Glove x={34} y={106} />
          <Glove x={66} y={106} />
        </>
      );
    case "jalan_lurus":
      return (
        <>
          {sleeves([41, 117], [59, 117])}
          <Fan cards={[["3", "♠"], ["4", "♥"], ["5", "♣"], ["6", "♦"], ["7", "♠"]]} />
          <Glove x={41} y={117} />
          <Glove x={59} y={117} />
        </>
      );
    case "pencinta_warna":
      return (
        <>
          {sleeves([41, 117], [59, 117])}
          <Fan cards={[["2", "♦"], ["6", "♦"], ["9", "♦"], ["J", "♦"], ["K", "♦"]]} />
          <Glove x={41} y={117} />
          <Glove x={59} y={117} />
        </>
      );
    case "pasangan_setia":
      return (
        <>
          {sleeves([26, 100], [74, 100])}
          <HeldCard x={24} y={88} rot={-14} rank="7" suit="♥" w={16} h={22} />
          <HeldCard x={76} y={88} rot={14} rank="7" suit="♣" w={16} h={22} />
          <Glove x={26} y={100} />
          <Glove x={74} y={100} />
        </>
      );
    case "si_nekat":
      return (
        <>
          {sleeves([29, 104], [71, 104])}
          <g transform="rotate(-12 27 92)">
            <rect x={20} y={85} width={14} height={14} rx={2.4} fill={IVORY} stroke={INK} strokeWidth={1.1} />
            <circle cx={24} cy={89} r={1.3} fill={INK} />
            <circle cx={27} cy={92} r={1.3} fill={INK} />
            <circle cx={30} cy={95} r={1.3} fill={INK} />
          </g>
          <g transform="rotate(14 73 92)">
            <rect x={66} y={85} width={14} height={14} rx={2.4} fill={IVORY} stroke={INK} strokeWidth={1.1} />
            <circle cx={70} cy={89} r={1.3} fill={CRIMSON} />
            <circle cx={76} cy={89} r={1.3} fill={CRIMSON} />
            <circle cx={70} cy={95} r={1.3} fill={CRIMSON} />
            <circle cx={76} cy={95} r={1.3} fill={CRIMSON} />
          </g>
          <Glove x={29} y={104} />
          <Glove x={71} y={104} />
        </>
      );
    case "raja_hati":
      return (
        <>
          {sleeves([36, 110], [64, 110])}
          <path d="M50 125 C38 116 33 109 33 102 C33 95 38.5 92 43 92 C46.5 92 48.6 94 50 97 C51.4 94 53.5 92 57 92 C61.5 92 67 95 67 102 C67 109 62 116 50 125 Z" fill={accent} stroke={INK} strokeWidth={1.2} />
          <path d="M40 98 Q42 94 45 94" stroke="#fff" strokeWidth={1.2} fill="none" opacity={0.5} />
          <path d="M42.5 93 L44 85.5 L47.3 89.5 L50 83.5 L52.7 89.5 L56 85.5 L57.5 93 Z" fill={GOLD} stroke={GOLD_DARK} strokeWidth={0.8} strokeLinejoin="round" />
          <Glove x={36} y={110} />
          <Glove x={64} y={110} />
        </>
      );
    case "vampir":
      return (
        <>
          {sleeves([42, 112], [58, 112])}
          <path d="M41.5 95 H58.5 Q58.5 107 50 109.5 Q41.5 107 41.5 95 Z" fill={GOLD} stroke={GOLD_DARK} strokeWidth={0.9} />
          <path d="M43 97 H57 Q56.5 104 50 106 Q43.5 104 43 97 Z" fill={accent} />
          <path d="M50 109.5 V117 M44.5 118 H55.5" stroke={GOLD} strokeWidth={1.8} strokeLinecap="round" />
          <Glove x={42} y={112} />
          <Glove x={58} y={112} />
        </>
      );
    case "tangan_ekstra":
      return (
        <>
          {sleeves([23, 96], [77, 96])}
          {sleeves([35, 118], [65, 118])}
          <HeldCard x={21} y={85} rot={-16} rank="A" suit="♠" w={13} h={18} />
          <HeldCard x={79} y={85} rot={16} rank="K" suit="♥" w={13} h={18} />
          <HeldCard x={32} y={108} rot={-8} rank="Q" suit="♦" w={13} h={18} />
          <HeldCard x={68} y={108} rot={8} rank="J" suit="♣" w={13} h={18} />
          <Glove x={23} y={96} />
          <Glove x={77} y={96} />
          <Glove x={35} y={118} />
          <Glove x={65} y={118} />
        </>
      );
    case "pengganda":
      return (
        <>
          {sleeves([32, 115], [68, 115])}
          <rect x={25} y={93} width={50} height={23} rx={2.4} fill={IVORY} stroke={INK} strokeWidth={1.2} />
          <rect x={27} y={95} width={46} height={19} rx={1.6} fill="none" stroke={GOLD_DARK} strokeWidth={0.6} />
          <text x={50} y={109.5} fontSize={13} fontWeight={700} textAnchor="middle" fill={CRIMSON} fontFamily="Georgia, serif">
            ×1.5
          </text>
          <Glove x={32} y={115} />
          <Glove x={68} y={115} />
        </>
      );
  }
}

/** Scrollwork in one corner of the frame; mirrored for the other three. */
function Flourish({ transform }: { transform?: string }) {
  return (
    <g transform={transform} fill="none" stroke={INK} strokeWidth={0.7} strokeLinecap="round">
      <path d="M4 15 Q4 4 15 4" />
      <path d="M7 15 Q7 7 15 7" opacity={0.6} />
      <path d="M8 10 Q11 9 10 12 Q9 14 7 12" />
      <circle cx={10} cy={10} r={1.1} fill={INK} stroke="none" />
    </g>
  );
}

/**
 * A joker as a dark, ornate card: a grinning jester holding what the joker does,
 * on a crimson lattice inside a scrolled ivory frame. Width comes from `className`.
 */
export default function JokerIcon({ id, className = "w-12" }: { id: JokerId; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const lattice = `lattice-${uid}`;
  const glow = `glow-${uid}`;
  const gold = `gold-${uid}`;
  const skin = `skin-${uid}`;
  const eyeGlow = `eye-${uid}`;
  const vignette = `vig-${uid}`;
  const accent = ACCENT[id];
  return (
    <span className={`block aspect-[5/7] shrink-0 ${className}`} aria-hidden>
      <svg viewBox="0 0 100 140" className="block h-full w-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]">
        <defs>
          <pattern id={lattice} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="10" height="10" fill={WINE} />
            <path d="M0 0 H10 M0 0 V10" stroke="#1d0507" strokeWidth={1.4} />
            <circle cx="5" cy="5" r="1" fill={CRIMSON} opacity={0.55} />
          </pattern>
          <radialGradient id={glow} cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor={accent} stopOpacity={0.4} />
            <stop offset="100%" stopColor={accent} stopOpacity={0} />
          </radialGradient>
          <radialGradient id={skin} cx="50%" cy="38%" r="62%">
            <stop offset="0%" stopColor="#f7f2e6" />
            <stop offset="70%" stopColor="#d8d0bf" />
            <stop offset="100%" stopColor="#8f8676" />
          </radialGradient>
          <filter id={eyeGlow} x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="1.1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id={vignette} cx="50%" cy="45%" r="70%">
            <stop offset="45%" stopColor="#000" stopOpacity={0} />
            <stop offset="100%" stopColor="#000" stopOpacity={0.75} />
          </radialGradient>
          <radialGradient id={gold} cx="35%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#fff1b8" />
            <stop offset="55%" stopColor={GOLD} />
            <stop offset="100%" stopColor={GOLD_DARK} />
          </radialGradient>
        </defs>

        {/* Ivory frame with scrollwork corners and a JOKER banner top and bottom. */}
        <rect x={0.6} y={0.6} width={98.8} height={138.8} rx={7} fill={IVORY} stroke={INK} strokeWidth={1.2} />
        <Flourish />
        <Flourish transform="translate(100 0) scale(-1 1)" />
        <Flourish transform="translate(0 140) scale(1 -1)" />
        <Flourish transform="translate(100 140) scale(-1 -1)" />

        <rect x={8} y={14} width={84} height={112} rx={2} fill={`url(#${lattice})`} stroke={INK} strokeWidth={1} />
        <rect x={8} y={14} width={84} height={112} rx={2} fill={`url(#${glow})`} />
        <rect x={8} y={14} width={84} height={112} rx={2} fill={`url(#${vignette})`} />
        <svg x={8} y={14} width={84} height={112} viewBox="8 14 84 112" overflow="hidden">
          <Jester vampire={id === "vampir"} ids={{ gold, skin, eyeGlow }} />
          <Props id={id} accent={accent} />
        </svg>
        <rect x={10} y={16} width={80} height={108} rx={1.5} fill="none" stroke={GOLD} strokeWidth={0.5} opacity={0.6} />

        <text x={50} y={11} fontSize={7.5} fontWeight={700} letterSpacing={1.2} textAnchor="middle" fill={INK} fontFamily="Georgia, 'Times New Roman', serif">
          JOKER
        </text>
        <text fontSize={7.5} fontWeight={700} letterSpacing={1.2} textAnchor="middle" fill={INK} fontFamily="Georgia, 'Times New Roman', serif" transform="translate(50 129) rotate(180)">
          JOKER
        </text>
      </svg>
    </span>
  );
}
