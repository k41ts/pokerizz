"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { findMatch, type MatchFound, type Seeker } from "@/lib/matchmaking";
import { skinById } from "@/lib/skins";
import { play } from "@/lib/sound";
import CardArt from "./CardArt";
import { TitleBadge } from "./TitleBadge";
import { SecondaryButton } from "./ui";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

interface Props {
  me: Seeker;
  onFound: (match: MatchFound) => void;
  onCancel: () => void;
}

function opponentName(match: MatchFound): string {
  if (match.kind === "bot") return match.name;
  return match.connected.role === "host" ? match.connected.names[1] : "Opponent";
}

function opponentTitle(match: MatchFound): string | null {
  return match.kind === "human" && match.connected.role === "host" ? match.connected.titles[1] : null;
}

function opponentSkin(match: MatchFound): string {
  if (match.kind === "bot") return match.skin;
  return match.connected.role === "host" ? match.connected.skins[1] : "classic";
}

/** Searching animation, then a short versus card before the game starts. */
export default function Matchmaking({ me, onFound, onCancel }: Props) {
  const reduce = useReducedMotion();
  const [seconds, setSeconds] = useState(0);
  const [found, setFound] = useState<MatchFound | null>(null);
  const foundRef = useRef(onFound);
  useEffect(() => {
    foundRef.current = onFound;
  });

  useEffect(() => {
    const abort = new AbortController();
    let reveal: ReturnType<typeof setTimeout> | undefined;
    // A short delay so a mount that is immediately undone (React dev mode) never joins the queue.
    const start = setTimeout(() => {
      findMatch(me, setSeconds, abort.signal)
        .then((match) => {
          play("connect");
          setFound(match);
          reveal = setTimeout(() => foundRef.current(match), 1800);
        })
        .catch(() => {
          // Cancelled by the player.
        });
    }, 60);
    return () => {
      clearTimeout(start);
      clearTimeout(reveal);
      abort.abort();
    };
    // One search per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center gap-8 p-6 text-center">
      {!found ? (
        <>
          <div className="relative grid size-56 place-items-center" aria-hidden>
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute inset-0 rounded-full border-2 border-ink/20"
                initial={{ opacity: 0.7, transform: "scale(0.4)" }}
                animate={reduce ? { opacity: 0.4 } : { opacity: 0, transform: "scale(1.15)" }}
                transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }}
              />
            ))}
            <motion.div
              className="w-20"
              animate={reduce ? undefined : { transform: ["rotate(-8deg)", "rotate(8deg)", "rotate(-8deg)"] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            >
              <CardArt faceDown skin={skinById(me.skin)} />
            </motion.div>
          </div>
          <div>
            <h1 className="font-display text-2xl">Finding an opponent…</h1>
            <p className="mt-2 text-base text-ink/60 tabular-nums">{seconds}s</p>
                      </div>
          <SecondaryButton onClick={onCancel} className="text-base">
            Cancel
          </SecondaryButton>
        </>
      ) : (
        <div className="flex w-full items-center justify-center gap-4 sm:gap-8">
          {[
            { name: me.name, skin: me.skin, title: me.title, from: -1 },
            { name: opponentName(found), skin: opponentSkin(found), title: opponentTitle(found), from: 1 },
          ].map((side, i) => (
            <motion.div
              key={i}
              className="flex flex-col items-center gap-3"
              initial={reduce ? { opacity: 0 } : { opacity: 0, transform: `translateX(${side.from * 80}px)` }}
              animate={{ opacity: 1, transform: "translateX(0px)" }}
              transition={{ duration: 0.45, ease: EASE_OUT }}
            >
              <div className="w-24 drop-shadow-[0_14px_18px_rgba(0,0,0,0.3)] sm:w-28">
                <CardArt faceDown skin={skinById(side.skin)} />
              </div>
              <p className="max-w-32 truncate font-display text-base">{side.name}</p>
              {side.title && <TitleBadge id={side.title} />}
            </motion.div>
          ))}
          <motion.span
            className="absolute font-display text-4xl text-signal"
            initial={{ opacity: 0, transform: "scale(2)" }}
            animate={{ opacity: 1, transform: "scale(1)" }}
            transition={{ duration: 0.35, ease: EASE_OUT, delay: 0.3 }}
          >
            VS
          </motion.span>
        </div>
      )}
    </main>
  );
}
