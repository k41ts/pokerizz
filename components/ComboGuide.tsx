import { card, type Card } from "@/lib/cards";
import { HAND_INFO, HAND_TYPES, type HandType } from "@/lib/hands";
import { scorePlay } from "@/lib/scoring";
import CardArt from "./CardArt";

const EXAMPLES: Record<HandType, { cards: Card[]; how: string }> = {
  high_card: { cards: [card(13, "S")], how: "Ga ada kartu yang cocok. Kartu tertinggi jadi kombinasinya." },
  pair: { cards: [card(7, "H"), card(7, "C")], how: "2 kartu angka sama." },
  two_pair: { cards: [card(7, "H"), card(7, "C"), card(11, "D"), card(11, "S")], how: "2 pasang angka sama." },
  three_kind: { cards: [card(12, "S"), card(12, "H"), card(12, "D")], how: "3 kartu angka sama." },
  straight: { cards: [card(5, "C"), card(6, "D"), card(7, "S"), card(8, "H"), card(9, "C")], how: "5 angka berurutan, simbol bebas." },
  flush: { cards: [card(2, "H"), card(6, "H"), card(9, "H"), card(11, "H"), card(13, "H")], how: "5 kartu simbol sama, angka bebas." },
  full_house: { cards: [card(3, "S"), card(3, "D"), card(3, "H"), card(8, "C"), card(8, "S")], how: "Three of a Kind + Pair." },
  four_kind: { cards: [card(9, "S"), card(9, "H"), card(9, "D"), card(9, "C")], how: "4 kartu angka sama." },
  straight_flush: { cards: [card(5, "H"), card(6, "H"), card(7, "H"), card(8, "H"), card(9, "H")], how: "Straight dengan simbol sama semua." },
};

/** Every hand from weakest to strongest, with a real example and what it scores. */
export default function ComboGuide({ compact }: { compact?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink/70 sm:text-base">
        Skor = nilai kombinasi + nilai semua kartu yang kamu mainkan, termasuk kartu tambahan di luar kombinasi. Kartu 2–9 sesuai angka, 10/J/Q/K bernilai 10, As bernilai 11. Jadi isi sampai 5 kartu biar skornya maksimal.
      </p>
      <ol className={`grid grid-cols-1 gap-2 ${compact ? "" : "md:grid-cols-2"}`}>
        {HAND_TYPES.map((h, i) => {
          const ex = EXAMPLES[h];
          const total = scorePlay(ex.cards, [])!.total;
          return (
            <li key={h} className="flex items-center gap-3 rounded-2xl bg-panel p-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-xs font-semibold text-paper" aria-label={`Peringkat ${i + 1} dari 9`}>
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <span className="font-display text-sm sm:text-base">{HAND_INFO[h].label}</span>
                  <span className="text-sm text-ink/60">
                    nilai <strong className="text-ink">{HAND_INFO[h].value}</strong>
                  </span>
                </div>
                <p className="text-sm text-ink/70">{ex.how}</p>
                <div className="mt-2 flex items-center gap-1">
                  {ex.cards.map((c) => (
                    <div key={c.id} className="w-9 sm:w-11">
                      <CardArt card={c} />
                    </div>
                  ))}
                  <span className="ml-auto text-sm font-semibold">= {total}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
