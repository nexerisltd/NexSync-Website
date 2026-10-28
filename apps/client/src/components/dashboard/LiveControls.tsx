"use client";

import { LIVE_CONSTANTS } from "@beatsync/shared";
import { Mic, Monitor, Radio, Square } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { startLiveBroadcast, stopLiveBroadcast } from "@/lib/live/liveController";
import { canBroadcastLive, canShareTabAudio } from "@/lib/live/support";
import { useGlobalStore } from "@/store/global";
import { useLiveStore } from "@/store/live";
import { Button } from "../ui/button";

const PRESETS = [
  { label: "Tight", ms: 700, hint: "Lowest delay, needs a good network" },
  { label: "Balanced", ms: LIVE_CONSTANTS.DEFAULT_PLAYOUT_DELAY_MS, hint: "Recommended" },
  { label: "Safe", ms: 2500, hint: "Most stable on weak connections" },
] as const;

export const LiveControls = () => {
  const isAdmin = useGlobalStore((state) => state.currentUser?.isAdmin ?? false);
  const info = useLiveStore((state) => state.info);
  const isBroadcasting = useLiveStore((state) => state.isBroadcasting);
  const isStarting = useLiveStore((state) => state.isStarting);
  const level = useLiveStore((state) => state.level);
  const [delayMs, setDelayMs] = useState<number>(LIVE_CONSTANTS.DEFAULT_PLAYOUT_DELAY_MS);

  // Listeners only see something while a broadcast is running
  if (!isAdmin && !info) return null;

  const supported = canBroadcastLive();

  return (
    <div className="space-y-2 py-3 mt-1">
      <div className="flex items-center gap-2 font-medium text-sm">
        <Radio size={16} className={cn(info && "text-red-500 animate-pulse")} />
        <span>Live broadcast</span>
        {info && (
          <span className="ml-auto rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-red-400">
            LIVE
          </span>
        )}
      </div>

      <div className="bg-white/4 rounded-md p-3 space-y-3">
        {info ? (
          <>
            <div className="text-xs text-neutral-300">
              {isBroadcasting
                ? "You are broadcasting your device audio to the room."
                : `Live from ${info.broadcasterName ?? "the host"}. Queue playback is paused.`}
              <span className="text-neutral-500"> Delay {(info.playoutDelayMs / 1000).toFixed(1)}s</span>
            </div>
            {isBroadcasting && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-red-500 transition-[width] duration-100" style={{ width: `${Math.round(level * 100)}%` }} />
              </div>
            )}
            {isAdmin && (
              <Button
                size="sm"
                className="h-auto w-full gap-1.5 bg-red-600/80 px-3 py-1.5 text-xs text-white hover:bg-red-600"
                onClick={stopLiveBroadcast}
              >
                <Square className="h-3 w-3" />
                Stop live
              </Button>
            )}
          </>
        ) : !supported ? (
          <div className="text-xs text-neutral-400">
            Live broadcast needs Chrome or Edge on a computer. Listening works on most browsers.
          </div>
        ) : (
          <>
            <div className="flex gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  title={preset.hint}
                  onClick={() => setDelayMs(preset.ms)}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1 text-[11px] transition-colors",
                    delayMs === preset.ms ? "bg-primary-600/80 text-white" : "bg-white/8 text-neutral-300 hover:bg-white/15"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {canShareTabAudio() && (
                <Button
                  size="sm"
                  disabled={isStarting}
                  className="h-auto flex-1 gap-1.5 bg-primary-600/80 px-3 py-1.5 text-xs text-white hover:bg-primary-600"
                  onClick={() => void startLiveBroadcast("tab", delayMs)}
                >
                  <Monitor className="h-3 w-3" />
                  Share tab audio
                </Button>
              )}
              <Button
                size="sm"
                disabled={isStarting}
                className="h-auto flex-1 gap-1.5 bg-white/8 px-3 py-1.5 text-xs text-white hover:bg-white/15"
                onClick={() => void startLiveBroadcast("mic", delayMs)}
              >
                <Mic className="h-3 w-3" />
                Microphone
              </Button>
            </div>
            <p className="text-[11px] leading-snug text-neutral-500">
              In the browser dialog pick a tab and tick &quot;Share tab audio&quot;. Listeners hear it about{" "}
              {(delayMs / 1000).toFixed(1)}s after you.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
