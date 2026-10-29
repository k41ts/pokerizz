"use client";

import { useEffect, useState } from "react";
import AccountSheet from "@/components/AccountSheet";
import Matchmaking from "@/components/Matchmaking";
import SkinShop from "@/components/SkinShop";
import Lobby, { type Connected } from "@/components/Lobby";
import { BotMatch, GuestMatch, HostMatch, type BotOpponent } from "@/components/Match";
import Menu from "@/components/Menu";
import Tutorial from "@/components/Tutorial";
import { useAccount } from "@/lib/account";
import { normalizeCode, send } from "@/lib/net";
import { setSoundSkin } from "@/lib/sound";

type Screen =
  | { kind: "menu" }
  | { kind: "lobby" }
  | { kind: "search"; id: number }
  | { kind: "bot"; opponent: BotOpponent; id: number }
  | ({ kind: "online" } & Connected);

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
  const account = useAccount();

  useEffect(() => {
    const saved = load(NAME_KEY);
    const first = load(TUTORIAL_KEY) !== "1";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once after hydration
    if (saved) setName(saved);
    // A shared invite link (?room=CODE) goes straight to joining that room.
    const room = new URLSearchParams(window.location.search).get("room");
    if (room) {
      window.history.replaceState(null, "", window.location.pathname);
      setLinkCode(normalizeCode(room));
      setScreen({ kind: "lobby" });
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

  const exit = () => {
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
      />
    );
  } else if (screen.kind === "online") {
    content =
      screen.role === "host" ? (
        <HostMatch
          link={screen.link}
          names={screen.names}
          userIds={screen.userIds}
          skins={screen.skins}
          onExit={exit}
          onRanked={account.refresh}
        />
      ) : (
        <GuestMatch link={screen.link} onExit={exit} onRanked={account.refresh} />
      );
  } else {
    content = (
      <Menu
        name={name}
        onName={updateName}
        profile={account.profile}
        accountsAvailable={account.available}
        newPlayer={newPlayer}
        onMatchmaking={search}
        onOnline={() => setScreen({ kind: "lobby" })}
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
      <AccountSheet open={accountOpen} onClose={() => setAccountOpen(false)} profile={account.profile} onChanged={account.refresh} />
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
