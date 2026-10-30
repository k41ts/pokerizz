"use client";

import { useEffect, useRef, useState } from "react";
import { PrimaryButton } from "@/components/ui";
import AccountSheet from "@/components/AccountSheet";
import Matchmaking from "@/components/Matchmaking";
import SkinShop from "@/components/SkinShop";
import Lobby, { type Connected } from "@/components/Lobby";
import { BotMatch, GuestMatch, HostMatch, type BotOpponent } from "@/components/Match";
import Menu from "@/components/Menu";
import Tutorial from "@/components/Tutorial";
import { useAccount } from "@/lib/account";
import type { GameState } from "@/lib/game";
import { describeError, joinRoom, normalizeCode, rehostRoom, send, type Link } from "@/lib/net";
import { clearMatch, loadMatch } from "@/lib/resume";
import { setSoundSkin } from "@/lib/sound";

type Screen =
  | { kind: "menu" }
  | { kind: "lobby" }
  | { kind: "search"; id: number }
  | { kind: "bot"; opponent: BotOpponent; id: number; resume?: { state: GameState; botMatchId: string | null } }
  | ({ kind: "online"; resume?: { state: GameState; matchId: string } } & Connected)
  /** Reopening the room of a match that was running before the page reloaded. */
  | { kind: "resuming"; error: string | null; seconds?: number };

/** Where a guest was heading when they were asked to sign in first. */
type Gated = "search" | "lobby";

const NAME_KEY = "kartuduel:name";
const TUTORIAL_KEY = "kartuduel:tutorial-done";

function load(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function save(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked: the setting lasts for this visit only.
  }
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>({ kind: "menu" });
  const [name, setName] = useState("Pemain");
  const [newPlayer, setNewPlayer] = useState(false);
  const [tutorial, setTutorial] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [linkCode, setLinkCode] = useState<string | undefined>();
  const [skinsOpen, setSkinsOpen] = useState(false);
  const [pending, setPending] = useState<Gated | null>(null);
  const account = useAccount();
  /** Bumped when a reconnect is cancelled, so a late answer from the room is ignored. */
  const resumeAttempt = useRef(0);

  /** Continue the match that was running before the page reloaded. */
  function resumeMatch(saved: NonNullable<ReturnType<typeof loadMatch>>) {
    if (saved.kind === "bot") {
      setScreen({ kind: "bot", id: Date.now(), opponent: saved.opponent, resume: { state: saved.state, botMatchId: saved.botMatchId } });
      return;
    }
    setScreen({ kind: "resuming", error: null });
    const attempt = ++resumeAttempt.current;
    const current = () => attempt === resumeAttempt.current;
    const onSearching = (seconds: number) => {
      if (current()) setScreen({ kind: "resuming", error: null, seconds });
    };
    const keep = (link: Link) => {
      if (current()) return true;
      link.close();
      return false;
    };
    const rejoin =
      saved.kind === "host"
        ? rehostRoom(saved.code).then((link) =>
            keep(link) &&
            setScreen({
              kind: "online",
              role: "host",
              code: saved.code,
              link,
              names: saved.names,
              userIds: saved.userIds,
              skins: saved.skins,
              resume: { state: saved.state, matchId: saved.matchId },
            }),
          )
        : joinRoom(saved.code, onSearching).then((link) => keep(link) && setScreen({ kind: "online", role: "guest", code: saved.code, link }));
    rejoin.catch((err) => {
      if (!current()) return;
      clearMatch();
      setScreen({ kind: "resuming", error: describeError(err) });
    });
  }

  useEffect(() => {
    const saved = load(NAME_KEY);
    const first = load(TUTORIAL_KEY) !== "1";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once after hydration
    if (saved) setName(saved);
    // A shared invite link (?room=CODE) goes straight to joining that room.
    const room = new URLSearchParams(window.location.search).get("room");
    if (room) {
      window.history.replaceState(null, "", window.location.pathname);
      clearMatch();
      setLinkCode(normalizeCode(room));
      setPending("lobby");
      return;
    }
    const match = loadMatch();
    if (match) {
      resumeMatch(match);
      return;
    }
    setNewPlayer(first);
    setTutorial(first);
  }, []);

  function updateName(value: string) {
    setName(value);
    save(NAME_KEY, value);
  }

  function finishTutorial() {
    save(TUTORIAL_KEY, "1");
    setNewPlayer(false);
    setTutorial(false);
  }

  const displayName = account.profile?.username ?? (name.trim() || "Pemain");
  const mySkin = account.profile?.skin ?? "classic";
  // Your skin's voice is the default for every sound you make.
  useEffect(() => setSoundSkin(mySkin), [mySkin]);
  const search = () => setScreen({ kind: "search", id: Date.now() });

  // Playing other people needs an account; once signed in, carry on to where they were going.
  const needsAccount = account.available && !account.userId;
  useEffect(() => {
    if (!pending || !account.ready) return;
    if (needsAccount) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- opens the sign-in sheet for the gated action
      setAccountOpen(true);
      return;
    }
    setPending(null);
    setAccountOpen(false);
    if (pending === "search") search();
    else setScreen({ kind: "lobby" });
  }, [pending, account.ready, needsAccount]);

  const exit = () => {
    clearMatch();
    if (screen.kind === "online") {
      const { link } = screen;
      send(link, { t: "bye" });
      // Give the goodbye a moment to leave before closing the channel.
      setTimeout(() => link.close(), 300);
    }
    setScreen({ kind: "menu" });
  };

  let content: React.ReactNode;
  if (screen.kind === "lobby") {
    content = (
      <Lobby
        name={displayName}
        userId={account.userId}
        skin={mySkin}
        initialCode={linkCode}
        onBack={() => {
          setLinkCode(undefined);
          setScreen({ kind: "menu" });
        }}
        onConnected={(c) => {
          setLinkCode(undefined);
          setScreen({ kind: "online", ...c });
        }}
      />
    );
  } else if (screen.kind === "search") {
    content = (
      <Matchmaking
        key={screen.id}
        me={{ name: displayName, userId: account.userId, stars: account.profile?.stars ?? 0, skin: mySkin }}
        onCancel={() => setScreen({ kind: "menu" })}
        onFound={(match) =>
          setScreen(
            match.kind === "human"
              ? { kind: "online", ...match.connected }
              : {
                  kind: "bot",
                  id: Date.now(),
                  opponent: { kind: "ranked", name: match.name, skin: match.skin, level: match.level, signedIn: !!account.userId },
                },
          )
        }
      />
    );
  } else if (screen.kind === "bot") {
    content = (
      <BotMatch
        key={screen.id}
        name={displayName}
        skin={mySkin}
        opponent={screen.opponent}
        onExit={exit}
        onSearchAgain={search}
        onRanked={account.refresh}
        resume={screen.resume}
      />
    );
  } else if (screen.kind === "online") {
    content =
      screen.role === "host" ? (
        <HostMatch
          code={screen.code}
          link={screen.link}
          names={screen.names}
          userIds={screen.userIds}
          skins={screen.skins}
          onExit={exit}
          onRanked={account.refresh}
          resume={screen.resume}
        />
      ) : (
        <GuestMatch code={screen.code} link={screen.link} onExit={exit} onRanked={account.refresh} />
      );
  } else if (screen.kind === "resuming") {
    content = (
      <main className="grid min-h-dvh place-items-center p-6 text-center">
        {screen.error ? (
          <div className="flex max-w-sm flex-col items-center gap-4">
            <p className="font-display text-xl">Pertandingan ga bisa dilanjutin</p>
            <p className="text-base text-ink/70">{screen.error}</p>
            <PrimaryButton onClick={() => setScreen({ kind: "menu" })}>Ke menu</PrimaryButton>
          </div>
        ) : (
          <div className="flex max-w-sm flex-col items-center gap-5">
            <p className="flex items-center gap-2 text-base text-ink/70">
              <span className="animate-pulse-dot size-2 rounded-full bg-signal" /> Nyambung lagi ke pertandinganmu…
              {!!screen.seconds && <span className="tabular-nums">{screen.seconds} dtk</span>}
            </p>
            <button
              type="button"
              onClick={() => {
                resumeAttempt.current++;
                clearMatch();
                setScreen({ kind: "menu" });
              }}
              className="press rounded-full bg-paper px-5 py-2.5 text-base font-semibold ring-1 ring-ink/15"
            >
              Batal, ke menu
            </button>
          </div>
        )}
      </main>
    );
  } else {
    content = (
      <Menu
        name={name}
        onName={updateName}
        profile={account.profile}
        accountsAvailable={account.available}
        newPlayer={newPlayer}
        needsAccount={needsAccount}
        onMatchmaking={() => setPending("search")}
        onOnline={() => setPending("lobby")}
        onBot={() => setScreen({ kind: "bot", id: Date.now(), opponent: { kind: "training" } })}
        onSkins={() => setSkinsOpen(true)}
        onTutorial={() => setTutorial(true)}
        onAccount={() => setAccountOpen(true)}
      />
    );
  }

  return (
    <>
      {content}
      {tutorial && (
        <Tutorial
          onClose={finishTutorial}
          onPlayBot={() => {
            finishTutorial();
            setScreen({ kind: "bot", id: Date.now(), opponent: { kind: "training" } });
          }}
        />
      )}
      <AccountSheet
        open={accountOpen}
        onClose={() => {
          setAccountOpen(false);
          setPending(null);
          setLinkCode(undefined);
        }}
        profile={account.profile}
        onChanged={account.refresh}
        // Keep the pending action: it continues once the new session arrives.
        onSignedIn={() => setAccountOpen(false)}
        reason={
          pending === "search"
            ? "Masuk dulu buat cari lawan. Menang dapet bintang dan poin."
            : pending === "lobby"
              ? "Masuk dulu buat main sama teman."
              : undefined
        }
      />
      <SkinShop
        open={skinsOpen}
        onClose={() => setSkinsOpen(false)}
        profile={account.profile}
        onChanged={account.refresh}
        onSignIn={() => {
          setSkinsOpen(false);
          setAccountOpen(true);
        }}
      />
    </>
  );
}
