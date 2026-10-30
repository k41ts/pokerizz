import { isTitle, TITLES, type TitleId } from "@/lib/titles";

const LOOK: Record<TitleId, string> = {
  top_1: "bg-[linear-gradient(100deg,#b8860b,#ffd95a_45%,#b8860b)] text-[#2a1c00]",
  king_full_house: "bg-signal text-snow",
  untouchable: "bg-[linear-gradient(100deg,#6fb7ff,#e4f4ff_50%,#6fb7ff)] text-[#062038]",
};

/** A player's equipped achievement title, as a small pill under their name. */
export function TitleBadge({ id, className = "" }: { id: string; className?: string }) {
  if (!isTitle(id)) return null;
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 truncate rounded-full px-2.5 py-0.5 font-display text-[10px] leading-4 tracking-wide ${LOOK[id]} ${className}`}
    >
      <svg viewBox="0 0 12 12" className="size-2.5 shrink-0" fill="currentColor" aria-hidden>
        <path d="m1 4 2.5 1.8L6 1.5l2.5 4.3L11 4l-1 6H2z" />
      </svg>
      <span className="truncate">{TITLES[id].label}</span>
    </span>
  );
}

