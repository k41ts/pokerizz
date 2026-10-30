import { TITLES, type TitleId } from "@/lib/titles";

const PODIUM = [
  "bg-[linear-gradient(100deg,#b8860b,#ffd95a_45%,#b8860b)] text-[#2a1c00]",
  "bg-[linear-gradient(100deg,#8e959c,#f1f3f5_45%,#8e959c)] text-[#1d2328]",
  "bg-[linear-gradient(100deg,#8a4b1f,#e7a56b_45%,#8a4b1f)] text-[#2b1405]",
];

const LOOK: Record<Exclude<TitleId, "leaderboard">, string> = {
  king_full_house: "bg-signal text-snow",
  untouchable: "bg-[linear-gradient(100deg,#6fb7ff,#e4f4ff_50%,#6fb7ff)] text-[#062038]",
};

/** Label and colors for a shown title: "top:N" or a title id. */
function resolve(id: string): { label: string; look: string } | null {
  const top = /^top:(\d+)$/.exec(id);
  if (top) {
    const n = Number(top[1]);
    return { label: `TOP ${n} LEADERBOARD`, look: PODIUM[Math.min(n, 3) - 1] };
  }
  if (id in LOOK) return { label: TITLES[id as TitleId].label, look: LOOK[id as keyof typeof LOOK] };
  return null;
}

/** A player's title, as a small pill under their name. */
export function TitleBadge({ id, className = "" }: { id: string; className?: string }) {
  const t = resolve(id);
  if (!t) return null;
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 truncate rounded-full px-2.5 py-0.5 font-display text-[10px] leading-4 tracking-wide ${t.look} ${className}`}
    >
      <svg viewBox="0 0 12 12" className="size-2.5 shrink-0" fill="currentColor" aria-hidden>
        <path d="m1 4 2.5 1.8L6 1.5l2.5 4.3L11 4l-1 6H2z" />
      </svg>
      <span className="truncate">{t.label}</span>
    </span>
  );
}
