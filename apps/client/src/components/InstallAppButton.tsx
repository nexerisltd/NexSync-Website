"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Shows "Install" only when the browser says NexSync can be installed as an app (PWA). */
export const InstallAppButton = () => {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!installEvent) return null;

  return (
    <button
      type="button"
      onClick={() => {
        void installEvent
          .prompt()
          .then(() => installEvent.userChoice)
          .finally(() => setInstallEvent(null));
      }}
      className="flex items-center gap-1 rounded-full border border-white/12 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-neutral-200 transition-colors hover:bg-white/10 hover:text-white"
    >
      <Download className="size-3" />
      Install app
    </button>
  );
};
