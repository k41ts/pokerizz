"use client";

import { useState } from "react";
import { buySkin, equipSkin, type Profile } from "@/lib/account";
import { card } from "@/lib/cards";
import { SKIN_IDS, SKINS, type SkinId } from "@/lib/skins";
import { play } from "@/lib/sound";
import CardArt from "./CardArt";
import Sheet from "./Sheet";

const PREVIEW = [card(13, "H"), card(14, "S")];

interface Props {
  open: boolean;
  onClose: () => void;
  profile: Profile | null;
  onChanged: () => void;
  onSignIn: () => void;
}

/** Card skins: bought with points from ranked games, shown to opponents during play. */
export default function SkinShop({ open, onClose, profile, onChanged, onSignIn }: Props) {
  const [busy, setBusy] = useState<SkinId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(id: SkinId) {
    if (!profile) return onSignIn();
    setBusy(id);
    setError(null);
    const owned = profile.skins.includes(id);
    const ok = owned ? await equipSkin(id) : await buySkin(id);
    setBusy(null);
    if (!ok) {
      setError(owned ? "Gagal pasang skin. Coba lagi." : "Poinmu belum cukup.");
      return;
    }
    play(owned ? "select" : "joker");
    onChanged();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Skin kartu">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-base text-ink/70">Lawanmu lihat skin kartumu selama main.</p>
        {profile && (
          <p className="rounded-full bg-ink px-4 py-1.5 font-display text-sm text-paper tabular-nums">{profile.points} poin</p>
        )}
      </div>
      {error && (
        <p role="alert" className="mb-3 rounded-2xl bg-signal/10 px-4 py-3 text-sm text-signal">
          {error}
        </p>
      )}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {SKIN_IDS.map((id) => {
          const skin = SKINS[id];
          const owned = profile?.skins.includes(id) ?? id === "classic";
          const equipped = (profile?.skin ?? "classic") === id;
          const affordable = (profile?.points ?? 0) >= skin.price;
          return (
            <li key={id} className={`flex flex-col gap-3 rounded-3xl bg-panel p-3 ${equipped ? "ring-2 ring-signal" : ""}`}>
              <div className="relative flex h-28 items-end justify-center">
                <div className="absolute w-16 origin-bottom" style={{ transform: "translateX(-22px) rotate(-10deg)" }}>
                  <CardArt faceDown skin={skin} />
                </div>
                {PREVIEW.map((c, i) => (
                  <div key={c.id} className="absolute w-16 origin-bottom" style={{ transform: `translateX(${i * 22}px) rotate(${i * 10}deg)` }}>
                    <CardArt card={c} skin={skin} />
                  </div>
                ))}
              </div>
              <div>
                <p className="font-display text-sm">{skin.name}</p>
                <p className="text-sm text-ink/60">{skin.description}</p>
              </div>
              <button
                type="button"
                disabled={busy !== null || equipped || (!owned && !!profile && !affordable)}
                onClick={() => void act(id)}
                className={`press mt-auto rounded-full px-3 py-2 text-sm font-semibold disabled:opacity-50 ${
                  equipped ? "bg-paper text-ink" : owned ? "bg-ink text-paper" : "bg-signal text-paper"
                }`}
              >
                {busy === id ? "Sebentar…" : equipped ? "Dipakai" : owned ? "Pakai" : `${skin.price} poin`}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-sm text-ink/60">Dapat poin dari main ranked pakai akun: menang +30, kalah +10.</p>
    </Sheet>
  );
}
