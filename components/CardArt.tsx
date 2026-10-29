import { memo } from "react";
import { RED_SUITS, rankLabel, type Card, type Suit } from "@/lib/cards";

const INK = "#000";
const RED = "#ff2a1f";
const PAPER = "#fff";
const STEEL = "#e8e8e6";

/** Suit glyphs drawn in a 24×24 box. */
const SUIT_PATH: Record<Suit, string> = {
  H: "M12 21s-7.5-4.6-9.8-9.3C.6 8.1 2.5 4 6.3 4c2.3 0 3.9 1.3 5.7 3.3C13.8 5.3 15.4 4 17.7 4c3.8 0 5.7 4.1 4.1 7.7C19.5 16.4 12 21 12 21z",
  D: "M12 1.5 20.5 12 12 22.5 3.5 12z",
  S: "M12 1.5S2.8 9.2 2.8 14c0 2.9 2.3 5 5 5 1.6 0 3-.7 3.6-1.8L10 22.5h4l-1.4-5.3c.6 1.1 2 1.8 3.6 1.8 2.7 0 5-2.1 5-5C21.2 9.2 12 1.5 12 1.5z",
  C: "M12 2.2a4.6 4.6 0 0 0-3.9 7A4.6 4.6 0 1 0 10.6 17L9.6 22.5h4.8l-1-5.5a4.6 4.6 0 1 0 2.5-7.8A4.6 4.6 0 0 0 12 2.2z",
};

export function SuitGlyph({ suit, x, y, size, flip, color }: { suit: Suit; x: number; y: number; size: number; flip?: boolean; color: string }) {
  const s = size / 24;
  return (
    <path
      d={SUIT_PATH[suit]}
      fill={color}
      transform={`translate(${x} ${y}) ${flip ? "rotate(180)" : ""} scale(${s}) translate(-12 -12)`}
    />
  );
}

const L = 31;
const M = 50;
const R = 69;
/** Classic pip positions; pips below the middle are drawn upside down. */
const PIPS: Record<number, [number, number][]> = {
  2: [[M, 30], [M, 110]],
  3: [[M, 30], [M, 70], [M, 110]],
  4: [[L, 30], [R, 30], [L, 110], [R, 110]],
  5: [[L, 30], [R, 30], [M, 70], [L, 110], [R, 110]],
  6: [[L, 30], [R, 30], [L, 70], [R, 70], [L, 110], [R, 110]],
  7: [[L, 30], [R, 30], [M, 50], [L, 70], [R, 70], [L, 110], [R, 110]],
  8: [[L, 30], [R, 30], [M, 50], [L, 70], [R, 70], [M, 90], [L, 110], [R, 110]],
  9: [[L, 30], [R, 30], [L, 57], [R, 57], [M, 70], [L, 83], [R, 83], [L, 110], [R, 110]],
  10: [[L, 30], [R, 30], [M, 43], [L, 57], [R, 57], [L, 83], [R, 83], [M, 97], [L, 110], [R, 110]],
};

function Corner({ card, color, flip }: { card: Card; color: string; flip?: boolean }) {
  return (
    <g transform={flip ? "rotate(180 50 70)" : undefined}>
      <text
        x={10}
        y={18}
        textAnchor="middle"
        fontSize={card.rank === 10 ? 12 : 14}
        fontWeight={700}
        fill={color}
        style={{ fontFamily: "var(--font-display)" }}
        letterSpacing={card.rank === 10 ? -1.5 : 0}
      >
        {rankLabel(card.rank)}
      </text>
      <SuitGlyph suit={card.suit} x={10} y={27} size={9} color={color} />
    </g>
  );
}

function King({ accent }: { accent: string }) {
  return (
    <g>
      <path d="M26 122 Q28 96 50 93 Q72 96 74 122 Z" fill={INK} />
      <path d="M33 104 L41 98 M67 104 L59 98" stroke={accent} strokeWidth={2} />
      <path d="M40 42 L42 27 L46.5 36 L50 22 L53.5 36 L58 27 L60 42 Z" fill={accent} />
      <path d="M35 64 Q35 41 50 40 Q65 41 65 64 L63 80 Q50 89 37 80 Z" fill={PAPER} stroke={INK} strokeWidth={2.2} />
      <rect x={37.5} y={56} width={25} height={7} rx={3.5} fill={INK} />
      <rect x={41} y={58.6} width={18} height={1.8} rx={0.9} fill={accent} />
      <path d="M41 70 h18 M43 74 h14" stroke={INK} strokeWidth={1.4} strokeLinecap="round" />
      <path d="M44 84 L42 94 M56 84 L58 94 M50 87 V95" stroke={INK} strokeWidth={2} />
      <circle cx={35} cy={60} r={2.2} fill={accent} />
      <circle cx={65} cy={60} r={2.2} fill={accent} />
    </g>
  );
}

function Queen({ accent }: { accent: string }) {
  return (
    <g>
      <path d="M28 122 Q30 98 50 95 Q70 98 72 122 Z" fill={INK} />
      <path d="M32 92 Q26 60 36 44 Q50 30 64 44 Q74 60 68 92 L62 84 Q66 62 58 52 L42 52 Q34 62 38 84 Z" fill={INK} />
      <ellipse cx={50} cy={64} rx={13} ry={17} fill={PAPER} stroke={INK} strokeWidth={2} />
      <path d="M41 61 Q44 59 47 61 M53 61 Q56 59 59 61" stroke={INK} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <path d="M39 70 Q50 66 61 70 L59 80 Q50 86 41 80 Z" fill={INK} />
      <path d="M43 75 h14" stroke={accent} strokeWidth={1.6} strokeLinecap="round" />
      <circle cx={64} cy={62} r={9.5} fill={INK} />
      <circle cx={64} cy={62} r={5.5} fill="none" stroke={accent} strokeWidth={2} />
      <circle cx={64} cy={62} r={1.8} fill={accent} />
      <path d="M38 47 Q50 36 64 52" stroke={INK} strokeWidth={3} fill="none" />
      <path d="M33 108 h12 M55 108 h12" stroke={accent} strokeWidth={1.6} />
    </g>
  );
}

function Jack({ accent }: { accent: string }) {
  return (
    <g>
      <path d="M27 122 Q29 97 50 94 Q71 97 73 122 Z" fill={INK} />
      <path d="M31 90 Q28 52 50 40 Q72 52 69 90 L61 92 Q63 70 50 66 Q37 70 39 92 Z" fill={INK} />
      <path d="M38 62 Q38 50 50 49 Q62 50 62 62 L61 78 Q50 86 39 78 Z" fill={PAPER} stroke={INK} strokeWidth={2} />
      <rect x={36} y={55} width={28} height={9} rx={4.5} fill={INK} />
      <circle cx={44} cy={59.5} r={3.3} fill="none" stroke={accent} strokeWidth={1.8} />
      <circle cx={56} cy={59.5} r={3.3} fill="none" stroke={accent} strokeWidth={1.8} />
      <path d="M40 70 L60 70 L57 80 Q50 84 43 80 Z" fill={accent} />
      <path d="M43 74 h14 M45 77 h10" stroke={INK} strokeWidth={1} />
      <path d="M50 40 L50 30 M50 30 l5 -4" stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
      <circle cx={55} cy={26} r={1.8} fill={accent} />
    </g>
  );
}

function Ace({ suit, color }: { suit: Suit; color: string }) {
  return (
    <g>
      <circle cx={50} cy={70} r={34} fill="none" stroke={INK} strokeOpacity={0.15} strokeWidth={0.8} />
      <circle cx={50} cy={70} r={27} fill="none" stroke={INK} strokeOpacity={0.35} strokeWidth={0.8} strokeDasharray="2 3" />
      <path d="M50 30 v8 M50 102 v8 M10 70 h8 M82 70 h8" stroke={INK} strokeWidth={1.2} />
      <SuitGlyph suit={suit} x={50} y={70} size={38} color={color} />
      <circle cx={74} cy={47} r={2.2} fill={RED} />
    </g>
  );
}

function Face({ card }: { card: Card }) {
  const color = RED_SUITS.includes(card.suit) ? RED : INK;
  const r = card.rank;

  if (r >= 11 && r <= 13) {
    const Portrait = r === 13 ? King : r === 12 ? Queen : Jack;
    return (
      <>
        <rect x={20} y={14} width={60} height={112} rx={7} fill={STEEL} />
        <clipPath id={`clip-${card.id}`}>
          <rect x={20} y={14} width={60} height={112} rx={7} />
        </clipPath>
        <g clipPath={`url(#clip-${card.id})`}>
          <path d="M20 40 L80 22 M20 64 L80 46" stroke={INK} strokeOpacity={0.08} strokeWidth={6} />
          <Portrait accent={RED} />
        </g>
        <SuitGlyph suit={card.suit} x={70} y={24} size={10} color={color} />
      </>
    );
  }
  if (r === 14) return <Ace suit={card.suit} color={color} />;
  return (
    <>
      {PIPS[r].map(([x, y], i) => (
        <SuitGlyph key={i} suit={card.suit} x={x} y={y} size={r >= 9 ? 15 : 17} flip={y > 72} color={color} />
      ))}
    </>
  );
}

function Back() {
  return (
    <>
      <defs>
        <pattern id="kd-stripes" width={14} height={14} patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
          <rect width={14} height={14} fill={INK} />
          <rect width={6} height={14} fill={RED} />
        </pattern>
      </defs>
      <rect x={0} y={0} width={100} height={140} rx={9} fill={INK} />
      <rect x={6} y={6} width={88} height={128} rx={6} fill="url(#kd-stripes)" />
      <rect x={6} y={6} width={88} height={128} rx={6} fill="none" stroke={PAPER} strokeWidth={1.2} />
      <circle cx={50} cy={70} r={19} fill={INK} stroke={PAPER} strokeWidth={1.4} />
      <text x={50} y={75} textAnchor="middle" fontSize={13} fill={PAPER} style={{ fontFamily: "var(--font-display)" }}>
        KD
      </text>
    </>
  );
}

/** A card face or back as one SVG, so it scales cleanly at any size. */
function CardArt({ card, faceDown }: { card?: Card; faceDown?: boolean }) {
  const back = faceDown || !card || card.rank === 0;
  const color = card && RED_SUITS.includes(card.suit) ? RED : INK;
  return (
    <svg viewBox="0 0 100 140" className="block h-full w-full" aria-hidden>
      {back ? (
        <Back />
      ) : (
        <>
          <rect x={0.75} y={0.75} width={98.5} height={138.5} rx={9} fill={PAPER} stroke={INK} strokeOpacity={0.12} strokeWidth={1.5} />
          <Face card={card} />
          <Corner card={card} color={color} />
          <Corner card={card} color={color} flip />
        </>
      )}
    </svg>
  );
}

export default memo(CardArt);
