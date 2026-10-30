import type { JokerId } from "@/lib/jokers";

/** Each joker's color: the jester's hat and suit, and the card's border. */
const COLOR: Record<JokerId, string> = {
  pasangan_setia: "#e0457b",
  pencinta_warna: "#7a4dff",
  jalan_lurus: "#0e9f9a",
  si_nekat: "#ee7d1c",
  raja_hati: "#d61f3c",
  tameng: "#3567d6",
  vampir: "#6e0f2b",
  tangan_ekstra: "#2a9a55",
  pengganda: "#c4920c",
};

const DARK = "#1b1b1f";
const SKIN = "#fbe1cc";
const GOLD = "#f4c542";
const RED = "#e0262e";

function Hand({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={3.8} fill={SKIN} stroke={DARK} strokeWidth={1.2} />;
}

/** An arm from the shoulder to where the hand holds something. */
function Arm({ from, to, color }: { from: [number, number]; to: [number, number]; color: string }) {
  const d = `M${from[0]} ${from[1]} Q${(from[0] + to[0]) / 2 + (to[0] < 50 ? -6 : 6)} ${(from[1] + to[1]) / 2 + 6} ${to[0]} ${to[1]}`;
  // Outlined so the sleeve reads against the body of the same color.
  return (
    <>
      <path d={d} fill="none" stroke={DARK} strokeWidth={7.6} strokeLinecap="round" />
      <path d={d} fill="none" stroke={color} strokeWidth={5.2} strokeLinecap="round" />
    </>
  );
}

/** A small playing card held by the jester. */
function MiniCard({ x, y, rot = 0, rank, suit, w = 13, h = 18 }: { x: number; y: number; rot?: number; rank: string; suit: string; w?: number; h?: number }) {
  const red = suit === "♥" || suit === "♦";
  return (
    <g transform={`rotate(${rot} ${x} ${y + h / 2})`}>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={1.8} fill="#fff" stroke={DARK} strokeWidth={1} />
      <text x={x - w / 2 + 2} y={y - h / 2 + 6.2} fontSize={5.8} fontWeight={700} fill={red ? RED : DARK} fontFamily="system-ui, sans-serif">
        {rank}
      </text>
      <text x={x} y={y + 4} fontSize={8} textAnchor="middle" fill={red ? RED : DARK}>
        {suit}
      </text>
    </g>
  );
}

/** A fan of cards held at the chest, pivoting from below. */
function Fan({ cards }: { cards: [string, string][] }) {
  const mid = (cards.length - 1) / 2;
  return (
    <>
      {cards.map(([rank, suit], i) => (
        <g key={i} transform={`rotate(${(i - mid) * 13} 50 124)`}>
          <MiniCard x={50} y={102} rank={rank} suit={suit} />
        </g>
      ))}
    </>
  );
}

function Jester({ color, vampire }: { color: string; vampire?: boolean }) {
  return (
    <>
      {vampire && (
        // A high cape collar behind the head.
        <path d="M30 88 L22 56 L42 76 Z M70 88 L78 56 L58 76 Z" fill={DARK} />
      )}
      {/* Body, split harlequin style. */}
      <path d="M35 84 Q50 79 65 84 L71 126 Q50 132 29 126 Z" fill={color} stroke={DARK} strokeWidth={1.2} />
      <path d="M50 81 L50 130 Q61 129 71 126 L65 84 Q58 81.5 50 81 Z" fill={DARK} opacity={0.22} />
      {/* Ruffled collar. */}
      <path d="M33 79 L37 86 L41 79.5 L45 86.5 L50 80 L55 86.5 L59 79.5 L63 86 L67 79 L64 76 L36 76 Z" fill="#fff" stroke={DARK} strokeWidth={1.1} strokeLinejoin="round" />
      {/* Three-pointed hat with bells. */}
      <path d="M36 52 C30 41 22 33 13 31 C24 25 37 32 47 45 Z" fill={color} stroke={DARK} strokeWidth={1.1} />
      <path d="M64 52 C70 41 78 33 87 31 C76 25 63 32 53 45 Z" fill={color} stroke={DARK} strokeWidth={1.1} />
      <path d="M40 48 C42 33 46 23 50 16 C54 23 58 33 60 48 Z" fill={DARK} />
      <circle cx={13} cy={31} r={3.6} fill={GOLD} stroke={DARK} strokeWidth={1} />
      <circle cx={87} cy={31} r={3.6} fill={GOLD} stroke={DARK} strokeWidth={1} />
      <circle cx={50} cy={16} r={3.6} fill={GOLD} stroke={DARK} strokeWidth={1} />
      {/* Face. */}
      <circle cx={50} cy={64} r={13} fill={SKIN} stroke={DARK} strokeWidth={1.3} />
      <path d="M35 54 Q50 44 65 54 L64 58.5 Q50 50 36 58.5 Z" fill={DARK} />
      <circle cx={45} cy={63} r={1.7} fill={vampire ? RED : DARK} />
      <circle cx={55} cy={63} r={1.7} fill={vampire ? RED : DARK} />
      <path d="M57.5 66 l1.8 2.8 l-1.8 2.8 l-1.8 -2.8 z" fill={color} />
      <circle cx={42.5} cy={68} r={2} fill="#f29a9a" opacity={0.8} />
      <circle cx={50} cy={66.5} r={1.7} fill={RED} />
      <path d="M44.5 70.5 Q50 75.5 55.5 70.5" fill="none" stroke={DARK} strokeWidth={1.3} strokeLinecap="round" />
      {vampire && <path d="M46.6 72.2 l1.2 3.2 l1.2 -2.9 M51 72.3 l1.2 2.9 l1.2 -3.2" fill="#fff" stroke={DARK} strokeWidth={0.7} strokeLinejoin="round" />}
      {/* Buttons. */}
      <circle cx={50} cy={98} r={1.6} fill={GOLD} />
      <circle cx={50} cy={108} r={1.6} fill={GOLD} />
      <circle cx={50} cy={118} r={1.6} fill={GOLD} />
    </>
  );
}

const SHOULDERS: [[number, number], [number, number]] = [
  [37, 89],
  [63, 89],
];

/** Arms and whatever this joker holds, drawn in front of the jester. */
function Props({ id, color }: { id: JokerId; color: string }) {
  const arms = (l: [number, number], r: [number, number]) => (
    <>
      <Arm from={SHOULDERS[0]} to={l} color={color} />
      <Arm from={SHOULDERS[1]} to={r} color={color} />
    </>
  );
  switch (id) {
    case "tameng":
      return (
        <>
          {arms([34, 104], [66, 104])}
          <path d="M50 88 L66 93 V105 Q66 118 50 126 Q34 118 34 105 V93 Z" fill="#3567d6" stroke={DARK} strokeWidth={1.5} />
          <path d="M50 92 V121 M37.5 104 H62.5" stroke="#fff" strokeWidth={1.8} opacity={0.75} />
          <Hand x={34} y={104} />
          <Hand x={66} y={104} />
        </>
      );
    case "jalan_lurus":
      return (
        <>
          {arms([41, 117], [59, 117])}
          <Fan cards={[["3", "♠"], ["4", "♥"], ["5", "♣"], ["6", "♦"], ["7", "♠"]]} />
          <Hand x={41} y={117} />
          <Hand x={59} y={117} />
        </>
      );
    case "pencinta_warna":
      return (
        <>
          {arms([41, 117], [59, 117])}
          <Fan cards={[["2", "♦"], ["6", "♦"], ["9", "♦"], ["J", "♦"], ["K", "♦"]]} />
          <Hand x={41} y={117} />
          <Hand x={59} y={117} />
        </>
      );
    case "pasangan_setia":
      return (
        <>
          {arms([27, 96], [73, 96])}
          <MiniCard x={25} y={84} rot={-14} rank="7" suit="♥" w={15} h={21} />
          <MiniCard x={75} y={84} rot={14} rank="7" suit="♣" w={15} h={21} />
          <Hand x={27} y={96} />
          <Hand x={73} y={96} />
        </>
      );
    case "si_nekat":
      return (
        <>
          {arms([30, 102], [70, 102])}
          <g transform="rotate(-12 28 90)">
            <rect x={21} y={83} width={14} height={14} rx={2.6} fill="#fff" stroke={DARK} strokeWidth={1.2} />
            <circle cx={25} cy={87} r={1.3} fill={DARK} />
            <circle cx={28} cy={90} r={1.3} fill={DARK} />
            <circle cx={31} cy={93} r={1.3} fill={DARK} />
          </g>
          <g transform="rotate(14 72 90)">
            <rect x={65} y={83} width={14} height={14} rx={2.6} fill="#fff" stroke={DARK} strokeWidth={1.2} />
            <circle cx={69} cy={87} r={1.3} fill={RED} />
            <circle cx={75} cy={87} r={1.3} fill={RED} />
            <circle cx={69} cy={93} r={1.3} fill={RED} />
            <circle cx={75} cy={93} r={1.3} fill={RED} />
          </g>
          <Hand x={30} y={102} />
          <Hand x={70} y={102} />
        </>
      );
    case "raja_hati":
      return (
        <>
          {arms([36, 108], [64, 108])}
          <path d="M50 124 C38 115 32 107 32 100 C32 93 38 90 42.5 90 C46 90 48.5 92 50 95 C51.5 92 54 90 57.5 90 C62 90 68 93 68 100 C68 107 62 115 50 124 Z" fill={RED} stroke={DARK} strokeWidth={1.4} />
          <path d="M42 92 L43.5 85 L47 89 L50 83 L53 89 L56.5 85 L58 92 Z" fill={GOLD} stroke={DARK} strokeWidth={1} strokeLinejoin="round" />
          <Hand x={36} y={108} />
          <Hand x={64} y={108} />
        </>
      );
    case "vampir":
      return (
        <>
          {arms([42, 110], [58, 110])}
          <path d="M42 94 H58 Q58 106 50 108 Q42 106 42 94 Z" fill="#b5102a" stroke={DARK} strokeWidth={1.2} />
          <path d="M50 108 V116 M45 117 H55" stroke={DARK} strokeWidth={1.6} strokeLinecap="round" />
          <path d="M43.5 97 H56.5" stroke="#ff6b7d" strokeWidth={1.2} opacity={0.7} />
          <Hand x={42} y={110} />
          <Hand x={58} y={110} />
        </>
      );
    case "tangan_ekstra":
      return (
        <>
          {arms([24, 92], [76, 92])}
          {arms([36, 116], [64, 116])}
          <MiniCard x={22} y={81} rot={-16} rank="A" suit="♠" w={12} h={17} />
          <MiniCard x={78} y={81} rot={16} rank="K" suit="♥" w={12} h={17} />
          <MiniCard x={33} y={106} rot={-8} rank="Q" suit="♦" w={12} h={17} />
          <MiniCard x={67} y={106} rot={8} rank="J" suit="♣" w={12} h={17} />
          <Hand x={24} y={92} />
          <Hand x={76} y={92} />
          <Hand x={36} y={116} />
          <Hand x={64} y={116} />
        </>
      );
    case "pengganda":
      return (
        <>
          {arms([33, 113], [67, 113])}
          <rect x={26} y={92} width={48} height={22} rx={3} fill="#fff" stroke={DARK} strokeWidth={1.5} />
          <text x={50} y={108} fontSize={13} fontWeight={800} textAnchor="middle" fill={color} fontFamily="system-ui, sans-serif">
            ×1.5
          </text>
          <Hand x={33} y={113} />
          <Hand x={67} y={113} />
        </>
      );
  }
}

/** A joker as a card: a jester holding what the joker is about. Width comes from `className`. */
export default function JokerIcon({ id, className = "w-12" }: { id: JokerId; className?: string }) {
  const color = COLOR[id];
  return (
    <span className={`block aspect-[5/7] shrink-0 ${className}`} aria-hidden>
      <svg viewBox="0 0 100 140" className="block h-full w-full drop-shadow-[0_2px_3px_rgba(0,0,0,0.25)]">
        <rect x={1} y={1} width={98} height={138} rx={9} fill="#fffaf0" stroke={DARK} strokeWidth={1.2} />
        <rect x={5} y={5} width={90} height={130} rx={6} fill="none" stroke={color} strokeWidth={2.2} />
        <circle cx={50} cy={74} r={40} fill={color} opacity={0.13} />
        <text x={10} y={20} fontSize={13} fontWeight={800} fill={color} fontFamily="system-ui, sans-serif">
          J
        </text>
        <text fontSize={13} fontWeight={800} fill={color} fontFamily="system-ui, sans-serif" transform="translate(90 120) rotate(180)">
          J
        </text>
        <Jester color={color} vampire={id === "vampir"} />
        <Props id={id} color={color} />
      </svg>
    </span>
  );
}
