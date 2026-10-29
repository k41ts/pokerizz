"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { describeError, hostRoom, joinRoom, makeRoomCode, normalizeCode, send, type Link } from "@/lib/net";
import { play } from "@/lib/sound";
import { ArrowIcon, PrimaryButton, SecondaryButton } from "./ui";

export type Connected =
  | { role: "host"; link: Link; names: [string, string]; userIds: [string | null, string | null] }
  | { role: "guest"; link: Link };

type Step =
  | { kind: "choose" }
  | { kind: "hosting"; code: string; ready: boolean }
  | { kind: "joining"; busy: boolean; seconds: number };

interface Props {
  name: string;
  userId: string | null;
  /** Room code from a shared link; joins right away. */
  initialCode?: string;
  onConnected: (c: Connected) => void;
  onBack: () => void;
}

export default function Lobby({ name, userId, initialCode, onConnected, onBack }: Props) {
  const [step, setStep] = useState<Step>(initialCode ? { kind: "joining", busy: false, seconds: 0 } : { kind: "choose" });
  const [code, setCode] = useState(initialCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const linkRef = useRef<Link | null>(null);
  const done = useRef(false);

  // Close the half-open peer if the player leaves the lobby.
  useEffect(
    () => () => {
      if (!done.current) linkRef.current?.close();
    },
    [],
  );

  async function host() {
    setError(null);
    const roomCode = makeRoomCode();
    setStep({ kind: "hosting", code: roomCode, ready: false });
    try {
      const { link, hello } = await hostRoom(roomCode, (open) => {
        linkRef.current = open;
        setStep({ kind: "hosting", code: roomCode, ready: true });
      });
      play("connect");
      done.current = true;
      onConnected({ role: "host", link, names: [name, hello.name || "Teman"], userIds: [userId, hello.userId] });
    } catch (err) {
      setError(describeError(err));
      setStep({ kind: "choose" });
    }
  }

  async function join(codeToJoin = code) {
    const roomCode = normalizeCode(codeToJoin);
    if (roomCode.length !== 5) {
      setError("Kode room isinya 5 huruf/angka.");
      return;
    }
    setError(null);
    setStep({ kind: "joining", busy: true, seconds: 0 });
    try {
      const link = await joinRoom(roomCode, (seconds) => setStep({ kind: "joining", busy: true, seconds }));
      linkRef.current = link;
      send(link, { t: "hello", name, userId });
      done.current = true;
      onConnected({ role: "guest", link });
    } catch (err) {
      setError(describeError(err));
      setStep({ kind: "joining", busy: false, seconds: 0 });
    }
  }

  // Opened from a shared link: join straight away.
  const autoJoined = useRef(false);
  useEffect(() => {
    if (!initialCode || autoJoined.current) return;
    autoJoined.current = true;
    void join(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once for the link's code
  }, [initialCode]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked: the code is on screen to read out.
    }
  }

  /** Native share sheet on phones (WhatsApp etc.), copying the link elsewhere. */
  async function share(roomCode: string) {
    const url = `${window.location.origin}/?room=${roomCode}`;
    const text = `Main Kartu Duel bareng aku! Kode room: ${roomCode}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Kartu Duel", text, url });
        return;
      } catch {
        // Share sheet closed: fall back to copying.
      }
    }
    await copy(`${text}
${url}`);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center gap-4 p-4">
      <button type="button" onClick={onBack} className="self-start text-sm text-steel hover:text-ink">
        ← Kembali
      </button>
      <h1 className="font-display text-2xl leading-tight sm:text-4xl">Main online sama teman</h1>
      <p className="max-w-lg text-base text-ink/70">
        Satu orang bikin room dan kasih kodenya. Yang lain masukin kode itu di HP atau laptopnya sendiri. Kalian main barengan, kartu masing-masing ga kelihatan di layar lawan.
      </p>

      {step.kind === "choose" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              play("click");
              void host();
            }}
            className="press group relative flex min-h-44 flex-col justify-between rounded-[28px] bg-ink p-6 text-left text-paper"
          >
            <span className="font-display text-lg">Bikin room</span>
            <span className="text-sm text-paper/60">Kamu dapet kode buat dikirim ke teman.</span>
            <span className="absolute top-5 right-5 grid size-10 place-items-center rounded-full bg-signal transition-transform duration-200 ease-[var(--ease-out)] [@media(hover:hover)]:group-hover:rotate-45">
              <ArrowIcon className="size-5" />
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              play("click");
              setStep({ kind: "joining", busy: false, seconds: 0 });
            }}
            className="press group relative flex min-h-44 flex-col justify-between rounded-[28px] bg-paper p-6 text-left"
          >
            <span className="font-display text-lg">Gabung room</span>
            <span className="text-sm text-ink/60">Masukin kode dari temanmu.</span>
            <span className="absolute top-5 right-5 grid size-10 place-items-center rounded-full bg-ink text-paper transition-transform duration-200 ease-[var(--ease-out)] [@media(hover:hover)]:group-hover:rotate-45">
              <ArrowIcon className="size-5" />
            </span>
          </button>
        </div>
      )}

      {step.kind === "hosting" && (
        <motion.section
          initial={{ opacity: 0, transform: "translateY(10px)" }}
          animate={{ opacity: 1, transform: "translateY(0)" }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="rounded-[28px] bg-paper p-6"
        >
          <p className="text-sm text-steel">Kode room</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="font-display text-5xl tracking-[0.2em] sm:text-6xl" aria-live="polite">
              {step.ready ? step.code : "·····"}
            </span>
          </div>
          {step.ready && (
            <div className="mt-4 flex flex-wrap gap-2">
              <PrimaryButton tone="red" onClick={() => void share(step.code)} className="text-base">
                Bagikan link
              </PrimaryButton>
              <SecondaryButton onClick={() => void copy(step.code)} className="text-base">
                {copied ? "Tersalin" : "Salin kode"}
              </SecondaryButton>
            </div>
          )}
          <p className="mt-4 flex items-center gap-2 text-base text-ink/70">
            <span className="animate-pulse-dot size-2 shrink-0 rounded-full bg-signal" />
            {step.ready ? "Nunggu temanmu gabung. Abis kirim link, balik lagi ke layar ini ya." : "Lagi bikin room…"}
          </p>
        </motion.section>
      )}

      {step.kind === "joining" && (
        <motion.form
          initial={{ opacity: 0, transform: "translateY(10px)" }}
          animate={{ opacity: 1, transform: "translateY(0)" }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="flex flex-col gap-4 rounded-[28px] bg-paper p-6"
          onSubmit={(e) => {
            e.preventDefault();
            void join();
          }}
        >
          <label htmlFor="room-code" className="text-sm text-steel">
            Kode room dari temanmu
          </label>
          <input
            id="room-code"
            autoFocus
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={code}
            onChange={(e) => setCode(normalizeCode(e.target.value))}
            placeholder="AB3CD"
            className="w-full rounded-2xl bg-panel px-5 py-4 font-display text-3xl tracking-[0.2em] outline-none placeholder:text-ink/20 focus-visible:ring-2 focus-visible:ring-signal"
          />
          <PrimaryButton tone="red" disabled={step.busy || code.length !== 5} onClick={() => void join()} className="self-start text-base">
            {step.busy ? "Nyari room…" : "Gabung"}
          </PrimaryButton>
          {step.busy && step.seconds >= 3 && (
            <p className="flex items-center gap-2 text-base text-ink/70">
              <span className="animate-pulse-dot size-2 shrink-0 rounded-full bg-signal" />
              Host belum jawab ({step.seconds} detik). Minta dia buka layar room di HP-nya.
            </p>
          )}
        </motion.form>
      )}

      {error && (
        <p role="alert" className="rounded-2xl bg-signal/10 px-4 py-3 text-sm text-signal">
          {error}
        </p>
      )}
    </main>
  );
}
