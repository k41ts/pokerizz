import type { JokerId } from "@/lib/jokers";

/** Each joker's tile color; the glyph on top is always white. */
const TILE: Record<JokerId, string> = {
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

function Glyph({ id }: { id: JokerId }) {
  switch (id) {
    case "pasangan_setia":
      // Two cards leaning on each other.
      return (
        <>
          <rect x="4.5" y="5" width="9" height="13" rx="1.6" transform="rotate(-12 9 11.5)" />
          <rect x="10.5" y="5" width="9" height="13" rx="1.6" transform="rotate(12 15 11.5)" fill="currentColor" fillOpacity="0.25" />
          <path d="M15 10.2c-.8-1-2.4-.4-2.2.9.2 1 2.2 2.3 2.2 2.3s2-1.3 2.2-2.3c.2-1.3-1.4-1.9-2.2-.9z" fill="currentColor" stroke="none" />
        </>
      );
    case "pencinta_warna":
      // A fanned flush: five cards of one suit.
      return (
        <>
          <path d="M12 19 7 6.5M12 19l-2.2-13M12 19V5.5M12 19l2.2-13M12 19l5-12.5" />
          <path d="M12 3.2 14 6l-2 2.8L10 6z" fill="currentColor" stroke="none" />
        </>
      );
    case "jalan_lurus":
      // Five rising steps.
      return <path d="M3.5 19.5h17M4.5 19.5v-3h3v-2.5h3V11h3V8h3V5h3v14.5" />;
    case "si_nekat":
      return (
        <>
          <rect x="4.5" y="4.5" width="15" height="15" rx="3.2" transform="rotate(8 12 12)" />
          <circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="15" cy="15" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="12.1" cy="12" r="1.3" fill="currentColor" stroke="none" />
        </>
      );
    case "raja_hati":
      return (
        <>
          <path d="m6 9.5 2-4.5 4 3 4-3 2 4.5z" fill="currentColor" stroke="none" />
          <path d="M12 20s-6-3.7-6-7.4C6 10.6 7.6 10 9 10c1.4 0 2.4.8 3 1.8.6-1 1.6-1.8 3-1.8 1.4 0 3 .6 3 2.6 0 3.7-6 7.4-6 7.4z" />
        </>
      );
    case "tameng":
      return (
        <>
          <path d="M12 3.5 19 6v5.5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6z" />
          <path d="M12 3.5v17" />
          <path d="M5 11h14" strokeOpacity="0.6" />
        </>
      );
    case "vampir":
      return (
        <>
          <path d="M4 7.5c2.4 1.6 5 2.2 8 2.2s5.6-.6 8-2.2" />
          <path d="M7.5 9.2 9 14l1.5-4.4M13.5 9.6 15 14l1.5-4.8" fill="currentColor" />
          <path d="M15 16.2c.9 1.3 1.4 2.1 1.4 2.7a1.4 1.4 0 0 1-2.8 0c0-.6.5-1.4 1.4-2.7z" fill="currentColor" stroke="none" />
        </>
      );
    case "tangan_ekstra":
      return (
        <>
          <rect x="4" y="6" width="9" height="13" rx="1.6" />
          <rect x="9" y="4" width="9" height="13" rx="1.6" fill="currentColor" fillOpacity="0.25" />
          <path d="M18.5 15.5v5M16 18h5" strokeWidth="2.4" />
        </>
      );
    case "pengganda":
      return (
        <>
          <path d="m5 6 7 7m0-7-7 7" strokeWidth="2.6" />
          <text x="13" y="20" fontSize="9" fontWeight="700" fill="currentColor" stroke="none" fontFamily="var(--font-display)">
            1.5
          </text>
        </>
      );
  }
}

/** A joker's badge: a colored tile with a drawn glyph. */
export default function JokerIcon({ id, className = "size-10" }: { id: JokerId; className?: string }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-[28%] text-snow shadow-[inset_0_-2px_0_rgba(0,0,0,0.25)] ${className}`}
      style={{ background: TILE[id] }}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-[62%]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <Glyph id={id} />
      </svg>
    </span>
  );
}
