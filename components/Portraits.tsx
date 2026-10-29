import type { Skin, SkinId } from "@/lib/skins";

/** Jack, Queen, King artwork. Drawn inside the face panel (x 20–80, y 14–126). Each skin has its own cast. */
type Portrait = (props: { p: Skin }) => React.ReactElement;

const SHOULDERS = "M28 124 Q30 102 50 99 Q70 102 72 124 Z";

/* ---------- Classic: cyber ---------- */

const CyberKing: Portrait = ({ p }) => (
  <g>
    <path d="M26 122 Q28 96 50 93 Q72 96 74 122 Z" fill={p.ink} />
    <path d="M33 104 L41 98 M67 104 L59 98" stroke={p.red} strokeWidth={2} />
    <path d="M40 42 L42 27 L46.5 36 L50 22 L53.5 36 L58 27 L60 42 Z" fill={p.red} />
    <path d="M35 64 Q35 41 50 40 Q65 41 65 64 L63 80 Q50 89 37 80 Z" fill={p.figure} stroke={p.ink} strokeWidth={2.2} />
    <rect x={37.5} y={56} width={25} height={7} rx={3.5} fill={p.ink} />
    <rect x={41} y={58.6} width={18} height={1.8} rx={0.9} fill={p.red} />
    <path d="M41 70 h18 M43 74 h14" stroke={p.ink} strokeWidth={1.4} strokeLinecap="round" />
    <path d="M44 84 L42 94 M56 84 L58 94 M50 87 V95" stroke={p.ink} strokeWidth={2} />
    <circle cx={35} cy={60} r={2.2} fill={p.red} />
    <circle cx={65} cy={60} r={2.2} fill={p.red} />
  </g>
);

const CyberQueen: Portrait = ({ p }) => (
  <g>
    <path d="M28 122 Q30 98 50 95 Q70 98 72 122 Z" fill={p.ink} />
    <path d="M32 92 Q26 60 36 44 Q50 30 64 44 Q74 60 68 92 L62 84 Q66 62 58 52 L42 52 Q34 62 38 84 Z" fill={p.ink} />
    <ellipse cx={50} cy={64} rx={13} ry={17} fill={p.figure} stroke={p.ink} strokeWidth={2} />
    <path d="M41 61 Q44 59 47 61 M53 61 Q56 59 59 61" stroke={p.ink} strokeWidth={1.6} fill="none" strokeLinecap="round" />
    <path d="M39 70 Q50 66 61 70 L59 80 Q50 86 41 80 Z" fill={p.ink} />
    <path d="M43 75 h14" stroke={p.red} strokeWidth={1.6} strokeLinecap="round" />
    <circle cx={64} cy={62} r={9.5} fill={p.ink} />
    <circle cx={64} cy={62} r={5.5} fill="none" stroke={p.red} strokeWidth={2} />
    <circle cx={64} cy={62} r={1.8} fill={p.red} />
    <path d="M38 47 Q50 36 64 52" stroke={p.ink} strokeWidth={3} fill="none" />
    <path d="M33 108 h12 M55 108 h12" stroke={p.red} strokeWidth={1.6} />
  </g>
);

const CyberJack: Portrait = ({ p }) => (
  <g>
    <path d="M27 122 Q29 97 50 94 Q71 97 73 122 Z" fill={p.ink} />
    <path d="M31 90 Q28 52 50 40 Q72 52 69 90 L61 92 Q63 70 50 66 Q37 70 39 92 Z" fill={p.ink} />
    <path d="M38 62 Q38 50 50 49 Q62 50 62 62 L61 78 Q50 86 39 78 Z" fill={p.figure} stroke={p.ink} strokeWidth={2} />
    <rect x={36} y={55} width={28} height={9} rx={4.5} fill={p.ink} />
    <circle cx={44} cy={59.5} r={3.3} fill="none" stroke={p.red} strokeWidth={1.8} />
    <circle cx={56} cy={59.5} r={3.3} fill="none" stroke={p.red} strokeWidth={1.8} />
    <path d="M40 70 L60 70 L57 80 Q50 84 43 80 Z" fill={p.red} />
    <path d="M43 74 h14 M45 77 h10" stroke={p.ink} strokeWidth={1} />
    <path d="M50 40 L50 30 M50 30 l5 -4" stroke={p.ink} strokeWidth={1.6} strokeLinecap="round" />
    <circle cx={55} cy={26} r={1.8} fill={p.red} />
  </g>
);

/* ---------- Blueprint: robots, drawn as line art ---------- */

const RobotKing: Portrait = ({ p }) => (
  <g stroke={p.ink} strokeWidth={1.8} strokeLinejoin="round">
    <rect x={30} y={96} width={40} height={32} rx={4} fill={p.figure} />
    <rect x={42} y={104} width={16} height={10} rx={2} fill="none" />
    <circle cx={50} cy={109} r={2} fill={p.red} stroke="none" />
    <rect x={45} y={88} width={10} height={9} fill={p.figure} />
    <path d="M38 44 V33 M50 44 V27 M62 44 V33" fill="none" />
    <circle cx={38} cy={31} r={2.6} fill={p.red} />
    <circle cx={50} cy={25} r={2.6} fill={p.red} />
    <circle cx={62} cy={31} r={2.6} fill={p.red} />
    <rect x={33} y={44} width={34} height={44} rx={5} fill={p.figure} />
    <rect x={39} y={56} width={8} height={7} fill={p.red} stroke="none" />
    <rect x={53} y={56} width={8} height={7} fill={p.red} stroke="none" />
    <path d="M40 73 H60 M40 77 H60 M40 81 H60" strokeWidth={1.3} />
    <circle cx={33} cy={66} r={2.5} fill={p.figure} />
    <circle cx={67} cy={66} r={2.5} fill={p.figure} />
  </g>
);

const RobotQueen: Portrait = ({ p }) => (
  <g stroke={p.ink} strokeWidth={1.8}>
    <path d="M30 124 Q30 100 50 96 Q70 100 70 124 Z" fill={p.figure} />
    <path d="M50 45 V34" fill="none" />
    <circle cx={50} cy={31} r={3} fill={p.red} />
    <circle cx={31} cy={64} r={6} fill={p.figure} />
    <circle cx={69} cy={64} r={6} fill={p.figure} />
    <circle cx={31} cy={64} r={2} fill={p.red} stroke="none" />
    <circle cx={69} cy={64} r={2} fill={p.red} stroke="none" />
    <ellipse cx={50} cy={65} rx={17} ry={20} fill={p.figure} />
    <rect x={37} y={58} width={26} height={8} rx={4} fill={p.ink} stroke="none" />
    <rect x={40} y={61} width={20} height={2} rx={1} fill={p.red} stroke="none" />
    <path d="M44 76 Q50 80 56 76" fill="none" />
    <path d="M40 108 H60" strokeDasharray="2 2" />
  </g>
);

const RobotJack: Portrait = ({ p }) => (
  <g stroke={p.ink} strokeWidth={1.8}>
    <rect x={34} y={98} width={32} height={30} rx={6} fill={p.figure} />
    <path d="M50 50 q4 -3 0 -6 q-4 -3 0 -6 q4 -3 0 -6" fill="none" strokeWidth={1.4} />
    <circle cx={50} cy={29} r={2.6} fill={p.red} />
    <path d="M32 84 Q32 50 50 50 Q68 50 68 84 Z" fill={p.figure} />
    <path d="M44 84 V98 M56 84 V98" />
    <circle cx={50} cy={67} r={8} fill={p.ink} />
    <circle cx={50} cy={67} r={3.8} fill={p.red} stroke="none" />
    <circle cx={38} cy={77} r={2} fill={p.red} stroke="none" />
    <circle cx={62} cy={77} r={2} fill={p.red} stroke="none" />
  </g>
);

/* ---------- Sakura: Japanese masks ---------- */

const OniKing: Portrait = ({ p }) => (
  <g>
    <path d="M28 70 L24 46 L34 54 L36 36 L44 48 L50 30 L56 48 L64 36 L66 54 L76 46 L72 70 Z" fill={p.ink} />
    <path d={SHOULDERS} fill={p.ink} />
    <path d="M42 100 L50 112 L58 100" stroke={p.red} strokeWidth={3} fill="none" />
    <path d="M36 47 L29 25 L42 42 Z" fill={p.figure} stroke={p.ink} strokeWidth={1.5} />
    <path d="M64 47 L71 25 L58 42 Z" fill={p.figure} stroke={p.ink} strokeWidth={1.5} />
    <path d="M32 60 Q32 44 50 43 Q68 44 68 60 L66 84 Q50 98 34 84 Z" fill={p.red} stroke={p.ink} strokeWidth={2} />
    <path d="M36 55 L47 61 M64 55 L53 61" stroke={p.ink} strokeWidth={3} strokeLinecap="round" />
    <circle cx={43} cy={65} r={3.6} fill={p.figure} />
    <circle cx={57} cy={65} r={3.6} fill={p.figure} />
    <circle cx={43} cy={65} r={1.6} fill={p.ink} />
    <circle cx={57} cy={65} r={1.6} fill={p.ink} />
    <path d="M46 72 Q50 75 54 72" stroke={p.ink} strokeWidth={1.6} fill="none" />
    <path d="M38 80 Q50 89 62 80 L60 85 Q50 93 40 85 Z" fill={p.ink} />
    <path d="M41 81 L43 88 L45 82 Z M59 81 L57 88 L55 82 Z" fill={p.figure} />
  </g>
);

const HannyaQueen: Portrait = ({ p }) => (
  <g>
    <path d="M30 120 Q24 70 36 50 Q50 40 64 50 Q76 70 70 120 Z" fill={p.ink} />
    <path d={SHOULDERS} fill={p.red} />
    <path d="M42 101 L50 116 L58 101" stroke={p.figure} strokeWidth={3} fill="none" />
    <path d="M38 50 Q30 34 25 22 Q36 31 43 46 Z" fill={p.figure} stroke={p.ink} strokeWidth={1.4} />
    <path d="M62 50 Q70 34 75 22 Q64 31 57 46 Z" fill={p.figure} stroke={p.ink} strokeWidth={1.4} />
    <path d="M36 58 Q36 46 50 45 Q64 46 64 58 L63 80 Q50 98 37 80 Z" fill={p.figure} stroke={p.ink} strokeWidth={2} />
    <path d="M39 58 Q43 53 47 58 M53 58 Q57 53 61 58" stroke={p.ink} strokeWidth={2} fill="none" />
    <ellipse cx={43} cy={64} rx={3.6} ry={2.4} fill={p.red} />
    <ellipse cx={57} cy={64} rx={3.6} ry={2.4} fill={p.red} />
    <circle cx={43} cy={64} r={1} fill={p.ink} />
    <circle cx={57} cy={64} r={1} fill={p.ink} />
    <path d="M38 76 Q50 89 62 76 Q50 83 38 76 Z" fill={p.red} stroke={p.ink} strokeWidth={1.4} />
    <path d="M40 77 L41.5 83 L43 78 Z M60 77 L58.5 83 L57 78 Z" fill={p.figure} />
    <path d="M45 79 V82 M50 80 V83.5 M55 79 V82" stroke={p.figure} strokeWidth={1.2} />
  </g>
);

const KitsuneJack: Portrait = ({ p }) => (
  <g>
    <path d="M30 122 Q28 80 36 66 L64 66 Q72 80 70 122 Z" fill={p.ink} />
    <path d={SHOULDERS} fill={p.ink} />
    <circle cx={50} cy={108} r={4} fill={p.red} />
    <path d="M34 56 L32 29 L47 46 Z" fill={p.figure} stroke={p.ink} strokeWidth={1.5} />
    <path d="M66 56 L68 29 L53 46 Z" fill={p.figure} stroke={p.ink} strokeWidth={1.5} />
    <path d="M36 50 L35 36 L43 46 Z M64 50 L65 36 L57 46 Z" fill={p.red} />
    <path d="M33 56 Q34 44 50 44 Q66 44 67 56 L62 74 L50 92 L38 74 Z" fill={p.figure} stroke={p.ink} strokeWidth={2} />
    <path d="M39 61 L46 63.5 M61 61 L54 63.5" stroke={p.ink} strokeWidth={2.4} strokeLinecap="round" />
    <path d="M50 48 L47.5 55 L50 58 L52.5 55 Z" fill={p.red} />
    <path d="M37 67 L44 69 M63 67 L56 69 M38 71 L44 72 M62 71 L56 72" stroke={p.red} strokeWidth={1.8} strokeLinecap="round" />
    <circle cx={50} cy={88} r={2.2} fill={p.ink} />
  </g>
);

/* ---------- Neon: aliens in glowing outline ---------- */

const AlienKing: Portrait = ({ p }) => (
  <g stroke={p.ink} strokeWidth={2}>
    <path d="M28 126 Q30 100 50 98 Q70 100 72 126 Z" fill={p.figure} />
    <path d="M34 104 L50 112 L66 104" stroke={p.red} fill="none" />
    <path d="M45 88 V99 M55 88 V99" />
    <path d="M28 58 Q28 30 50 30 Q72 30 72 58 Q72 76 58 88 Q50 94 42 88 Q28 76 28 58 Z" fill={p.figure} />
    <circle cx={40} cy={26} r={2.5} fill={p.red} stroke="none" />
    <circle cx={50} cy={22} r={2.8} fill={p.red} stroke="none" />
    <circle cx={60} cy={26} r={2.5} fill={p.red} stroke="none" />
    <path d="M33 60 Q40 52 47 62 Q40 68 33 60 Z" fill={p.ink} stroke="none" />
    <path d="M67 60 Q60 52 53 62 Q60 68 67 60 Z" fill={p.ink} stroke="none" />
    <circle cx={41} cy={60} r={1.4} fill={p.red} stroke="none" />
    <circle cx={59} cy={60} r={1.4} fill={p.red} stroke="none" />
    <path d="M47 80 H53" />
  </g>
);

const AlienQueen: Portrait = ({ p }) => (
  <g stroke={p.ink} strokeWidth={1.8}>
    <path d="M30 126 Q32 100 50 96 Q68 100 70 126 Z" fill={p.figure} />
    <circle cx={50} cy={106} r={3} fill={p.red} stroke="none" />
    <path d="M42 42 Q36 28 31 22 M58 42 Q64 28 69 22" fill="none" />
    <circle cx={31} cy={22} r={3} fill={p.red} stroke="none" />
    <circle cx={69} cy={22} r={3} fill={p.red} stroke="none" />
    <ellipse cx={50} cy={62} rx={18} ry={23} fill={p.figure} />
    <path d="M37 60 Q42 53 47 62 Q42 66 37 60 Z" fill={p.ink} stroke="none" />
    <path d="M63 60 Q58 53 53 62 Q58 66 63 60 Z" fill={p.ink} stroke="none" />
    <path d="M46 76 Q50 79 54 76 Q50 81 46 76 Z" fill={p.red} stroke="none" />
    <path d="M44 92 V97 M56 92 V97" />
  </g>
);

const AlienJack: Portrait = ({ p }) => (
  <g stroke={p.ink} strokeWidth={1.8}>
    <rect x={36} y={86} width={28} height={42} rx={10} fill={p.figure} />
    <path d="M36 98 L28 110 M64 98 L72 110" fill="none" />
    <path d="M44 48 L39 34 M56 48 L61 34" fill="none" />
    <circle cx={39} cy={32} r={2.5} fill={p.red} stroke="none" />
    <circle cx={61} cy={32} r={2.5} fill={p.red} stroke="none" />
    <circle cx={50} cy={65} r={18} fill={p.figure} />
    <circle cx={42} cy={64} r={4} fill={p.ink} stroke="none" />
    <circle cx={58} cy={64} r={4} fill={p.ink} stroke="none" />
    <circle cx={50} cy={54} r={3.2} fill={p.ink} stroke="none" />
    <circle cx={42} cy={64} r={1.4} fill={p.red} stroke="none" />
    <circle cx={58} cy={64} r={1.4} fill={p.red} stroke="none" />
    <circle cx={50} cy={54} r={1.2} fill={p.red} stroke="none" />
    <path d="M44 74 Q50 79 56 74" fill="none" />
  </g>
);

/* ---------- Gold: ancient Egypt ---------- */

const COLLAR = (p: Skin) => (
  <>
    <path d={SHOULDERS} fill={p.red} stroke={p.ink} strokeWidth={1.5} />
    <path d="M36 108 Q50 116 64 108 M34 116 Q50 124 66 116" stroke={p.ink} strokeWidth={1.5} fill="none" />
  </>
);

const PharaohKing: Portrait = ({ p }) => (
  <g>
    {COLLAR(p)}
    <path d="M30 96 L34 46 Q50 34 66 46 L70 96 L62 96 L60 60 L40 60 L38 96 Z" fill={p.red} stroke={p.ink} strokeWidth={1.5} />
    <path d="M33 56 H40 M33 64 H40 M32 72 H39 M32 80 H39 M31 88 H39 M60 56 H67 M60 64 H67 M61 72 H68 M61 80 H68 M61 88 H69" stroke={p.ink} strokeWidth={1.6} />
    <path d="M40 58 Q40 50 50 50 Q60 50 60 58 L59 76 Q50 86 41 76 Z" fill={p.figure} stroke={p.ink} strokeWidth={2} />
    <path d="M50 44 q-3 -4 0 -8 q3 4 0 8 Z" fill={p.ink} />
    <circle cx={50} cy={37} r={1.5} fill={p.red} />
    <path d="M42 62 H48 L50 64 M58 62 H52 L50 64" stroke={p.ink} strokeWidth={1.8} fill="none" />
    <rect x={47} y={83} width={6} height={13} rx={1} fill={p.ink} />
    <path d="M47 87 H53 M47 91 H53" stroke={p.red} strokeWidth={1} />
  </g>
);

const CleopatraQueen: Portrait = ({ p }) => (
  <g>
    {COLLAR(p)}
    <path d="M31 92 L32 52 Q50 36 68 52 L69 92 L61 92 L60 62 L40 62 L39 92 Z" fill={p.ink} />
    <path d="M36 58 Q50 49 64 58 L64 63 L36 63 Z" fill={p.ink} />
    <path d="M34 52 Q50 43 66 52" stroke={p.red} strokeWidth={3} fill="none" />
    <circle cx={50} cy={45} r={2.6} fill={p.red} />
    <path d="M40 63 L60 63 L59 78 Q50 88 41 78 Z" fill={p.figure} stroke={p.ink} strokeWidth={2} />
    <path d="M42 69 H48 L51 67 M58 69 H52 L49 67" stroke={p.ink} strokeWidth={2} fill="none" />
    <path d="M47 79 Q50 81 53 79" stroke={p.red} strokeWidth={2} fill="none" />
    <circle cx={38} cy={80} r={2.4} fill={p.red} />
    <circle cx={62} cy={80} r={2.4} fill={p.red} />
  </g>
);

const AnubisJack: Portrait = ({ p }) => (
  <g>
    {COLLAR(p)}
    <path d="M36 52 L33 22 L46 44 Z M64 52 L67 22 L54 44 Z" fill={p.ink} />
    <path d="M37 46 L35 30 L43 42 Z M63 46 L65 30 L57 42 Z" fill={p.red} />
    <path d="M34 60 Q34 44 50 44 Q66 44 66 60 L62 80 L56 93 L44 93 L38 80 Z" fill={p.ink} />
    <path d="M40 62 L47 64.5 M60 62 L53 64.5" stroke={p.red} strokeWidth={2.6} strokeLinecap="round" />
    <path d="M44 80 L50 92 L56 80" stroke={p.red} strokeWidth={1.2} fill="none" />
    <ellipse cx={50} cy={91} rx={3} ry={2} fill={p.red} />
  </g>
);

/* ---------- Void: skulls in bone white ---------- */

const Skull = ({ p, y = 0 }: { p: Skin; y?: number }) => (
  <g transform={`translate(0 ${y})`}>
    <path d="M34 62 Q34 40 50 40 Q66 40 66 62 Q66 70 62 74 L60 82 L40 82 L38 74 Q34 70 34 62 Z" fill={p.ink} />
    <path d="M38 60 Q43 54 48 61 Q44 67 39 64 Z M62 60 Q57 54 52 61 Q56 67 61 64 Z" fill={p.paper} />
    <circle cx={43} cy={61} r={1.3} fill={p.red} />
    <circle cx={57} cy={61} r={1.3} fill={p.red} />
    <path d="M50 66 L47 72 L53 72 Z" fill={p.paper} />
    <rect x={40} y={80} width={20} height={8} rx={2} fill={p.ink} />
    <path d="M44 80 V88 M48 80 V88 M52 80 V88 M56 80 V88" stroke={p.paper} strokeWidth={1.2} />
  </g>
);

const SkullKing: Portrait = ({ p }) => (
  <g>
    <path d="M26 124 Q28 98 50 94 Q72 98 74 124 Z" fill={p.red} />
    <path d="M38 104 Q50 110 62 104 M38 112 Q50 118 62 112" stroke={p.ink} strokeWidth={2} fill="none" />
    <Skull p={p} />
    <path d="M36 44 L38 28 L44 38 L50 24 L56 38 L62 28 L64 44 Z" fill={p.red} />
    <circle cx={50} cy={34} r={1.8} fill={p.ink} />
  </g>
);

const SkullQueen: Portrait = ({ p }) => (
  <g>
    <path d="M28 124 Q30 102 50 98 Q70 102 72 124 Z" fill={p.red} />
    <path d="M30 104 Q28 48 50 34 Q72 48 70 104 L64 104 Q66 56 50 45 Q34 56 36 104 Z" fill={p.red} />
    <Skull p={p} />
    <circle cx={39} cy={45} r={3.6} fill={p.ink} />
    <circle cx={61} cy={45} r={3.6} fill={p.ink} />
    <circle cx={39} cy={45} r={1.4} fill={p.red} />
    <circle cx={61} cy={45} r={1.4} fill={p.red} />
    <path d="M42 98 Q50 104 58 98" stroke={p.ink} strokeWidth={1.6} strokeDasharray="1.5 2.5" fill="none" />
  </g>
);

const ReaperJack: Portrait = ({ p }) => (
  <g>
    <path d="M74 26 L66 126" stroke={p.ink} strokeWidth={2} />
    <path d="M75 27 Q60 22 50 32 Q62 29 75 33 Z" fill={p.ink} />
    <path d="M28 126 L30 70 Q30 32 50 32 Q70 32 70 70 L72 126 L62 126 L62 66 Q62 48 50 48 Q38 48 38 66 L38 126 Z" fill={p.red} />
    <g transform="translate(50 64) scale(0.8) translate(-50 -64)">
      <Skull p={p} y={2} />
    </g>
  </g>
);

const CASTS: Record<SkinId, [Portrait, Portrait, Portrait]> = {
  classic: [CyberJack, CyberQueen, CyberKing],
  blueprint: [RobotJack, RobotQueen, RobotKing],
  sakura: [KitsuneJack, HannyaQueen, OniKing],
  neon: [AlienJack, AlienQueen, AlienKing],
  gold: [AnubisJack, CleopatraQueen, PharaohKing],
  void: [ReaperJack, SkullQueen, SkullKing],
};

/** The portrait for J (11), Q (12) or K (13) in the skin. Portraits are plain drawings with no state. */
export function renderPortrait(p: Skin, rank: number): React.ReactElement {
  return CASTS[p.id][rank - 11]({ p });
}
