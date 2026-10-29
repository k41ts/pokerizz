"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { buySkin, equipSkin, type Profile } from "@/lib/account";
import { card } from "@/lib/cards";
import { SKIN_IDS, SKINS, type Skin, type SkinId } from "@/lib/skins";
import { play } from "@/lib/sound";
import CardArt from "./CardArt";
import Sheet from "./Sheet";
import { PlayBurst, WIN_THEME, WinScene } from "./SkinFx";

const PREVIEW = [card(13, "H"), card(14, "S")];

/** Shows a skin's card-play flourish, then its win screen, without playing a game. */
function EffectPreview({ skin, onClose }: { skin: Skin; onClose: () => void }) {
  const theme = WIN_THEME[skin.id];
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`Efek skin ${skin.name}`}
      className="fixed inset-0 z-[60] flex cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden p-6 text-center"
      style={{ background: theme.bg, color: theme.text }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClose}
    >
      <WinScene skin={skin} />
      <PlayBurst skin={skin} />
      <p
        className="relative font-display text-[clamp(2.6rem,13vw,6rem)] leading-none"
        style={skin.id === "neon" ? { textShadow: "0 0 18px #22d3ee, 0 0 42px #f472b6" } : undefined}
      >
        MENANG
      </p>
      <p className="relative text-base" style={{ color: theme.muted }}>
        Skin {skin.name}. Ketuk di mana aja buat tutup.
      </p>
    </motion.div>
  );
}

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
  const [preview, setPreview] = useState<SkinId | null>(null);
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
                onClick={() => {
                  play("play");
                  setPreview(id);
                }}
                className="press text-sm font-semibold text-ink/70 underline underline-offset-4 hover:text-ink"
              >
                Lihat efek
              </button>
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
      {/* Portal: the sheet panel is transformed, which would trap a fixed overlay inside it. */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>{preview && <EffectPreview skin={SKINS[preview]} onClose={() => setPreview(null)} />}</AnimatePresence>,
          document.body,
        )}
    </Sheet>
  );
}
