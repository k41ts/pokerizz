"use client";

import { useEffect, useState } from "react";
import AccountSheet from "@/components/AccountSheet";
import Lobby, { type Connected } from "@/components/Lobby";
import { BotMatch, GuestMatch, HostMatch } from "@/components/Match";
import Menu from "@/components/Menu";
import Tutorial from "@/components/Tutorial";
import { useAccount } from "@/lib/account";
import { send } from "@/lib/net";

type Screen = { kind: "menu" } | { kind: "lobby" } | { kind: "bot" } | ({ kind: "online" } & Connected);

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
  const account = useAccount();

  useEffect(() => {
    const saved = load(NAME_KEY);
    const first = load(TUTORIAL_KEY) !== "1";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once after hydration
    if (saved) setName(saved);
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

  const exit = () => {
    if (screen.kind === "online") {
      const { link } = screen;
      send(link, { t: "bye" });
      // Give the goodbye a moment to leave before closing the channel.
      setTimeout(() => link.peer.destroy(), 300);
    }
    setScreen({ kind: "menu" });
  };

  let content: React.ReactNode;
  if (screen.kind === "lobby") {
    content = (
      <Lobby
        name={displayName}
        userId={account.userId}
        onBack={() => setScreen({ kind: "menu" })}
        onConnected={(c) => setScreen({ kind: "online", ...c })}
      />
    );
  } else if (screen.kind === "bot") {
    content = <BotMatch name={displayName} onExit={exit} />;
  } else if (screen.kind === "online") {
    content =
      screen.role === "host" ? (
        <HostMatch link={screen.link} names={screen.names} userIds={screen.userIds} onExit={exit} onRanked={account.refresh} />
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
        onOnline={() => setScreen({ kind: "lobby" })}
        onBot={() => setScreen({ kind: "bot" })}
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
            setScreen({ kind: "bot" });
          }}
        />
      )}
      <AccountSheet open={accountOpen} onClose={() => setAccountOpen(false)} profile={account.profile} onChanged={account.refresh} />
    </>
  );
}
